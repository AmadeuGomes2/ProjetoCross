/**
 * A leitura que alimenta o RDO de período: **um conjunto de dias, um
 * instantâneo**.
 *
 * ## Por que não é a leitura do diário chamada N vezes
 *
 * `docs/arquitetura/periodo.md`, 3.2, em ordem de gravidade:
 *
 * 1. **Determinismo.** O consolidado anexa os diários que ele resume. Trinta
 *    dias lidos um a um são centenas de consultas separadas, e uma retificação
 *    concorrente no meio delas faz o dia 02 vir de antes e o dia 09 de depois:
 *    o mesmo documento sairia com dois instantâneos, em desacordo com os
 *    diários anexados. Aqui as cinco leituras saem juntas, cada uma com o
 *    conjunto inteiro.
 * 2. **Custo, que aqui é superfície de ataque.** Com o teto de 366 dias, ler
 *    dia a dia seriam milhares de idas ao banco numa requisição com sessão
 *    válida — o jeito mais barato de derrubar o servidor de dentro.
 * 3. **Assimetria do domínio.** O acumulado não é por dia: é uma leitura só,
 *    até o último dia do conjunto (DP6).
 *
 * ## Conjunto, e não intervalo
 *
 * DP1: "três RDOs" pode ser 02, 05 e 09. `{02, 05, 09}` **não** traz o dia 03,
 * nem no `EXEC.` nem na contagem de mm. Um argumento de intervalo permitiria
 * escrever essa soma sem que ninguém percebesse na revisão — por isso a
 * assinatura recebe a lista de dias e nunca um par início/fim.
 *
 * ## O que este módulo não faz
 *
 * Não autoriza: quem chama já passou por `exigeAcessoNaObra`, como em
 * `painelDosUltimosDiasProtegido`. Não soma nada: o `EXEC.`, o `ACUM.` e a
 * média são cálculo do `rdo` (R5). Não inventa dia: dia sem registro
 * simplesmente não aparece em `dias`, e é assim que a ausência continua sendo
 * ausência e não um zero fabricado (decisão 4.2).
 */

import { comparaDias, type DiaPuro } from '../../shared/date/dia';
import type { ObraId } from '../../shared/id';
import { ok, type ErroDeDominio, type Result } from '../../shared/result';
import type { PortaDeStatusDeAtividade } from './portas';
import type { RepositorioDeLancamento } from './repositorio';
import type {
  AtividadeDoDia,
  DiaDeObra,
  LancamentoDeProducaoVigente,
  LinhaDeLancamento,
  ObservacaoDoDia,
  PluviometriaDoDia,
} from './tipos';
import { apenasVigentes, vigenteDaCadeia } from './vigencia';

/**
 * Tudo que um conjunto de dias precisa, lido de uma vez.
 *
 * `diasConsultados` é o conjunto **normalizado** — ordenado e sem repetição —,
 * devolvido para que quem exibe mostre o que de fato foi usado. Normalizar
 * calado e não mostrar seria o corte silencioso que o projeto proíbe
 * (`docs/arquitetura/periodo.md`, 1.3).
 *
 * `dias` traz **só os dias com registro**. A diferença entre `diasConsultados`
 * e `dias` é a lista de dias não lançados, e é ela que o consolidado precisa
 * mostrar: ninguém ter lançado é diferente de ter lançado que não houve
 * trabalho (decisão 4.2).
 */
export interface InstantaneoDoPeriodo {
  readonly diasConsultados: readonly DiaPuro[];
  /** Último dia do conjunto, que é a data de corte do acumulado (DP6). */
  readonly ate: DiaPuro | null;
  readonly dias: readonly DiaDeObra[];
  readonly atividades: readonly AtividadeDoDia[];
  readonly pluviometria: readonly PluviometriaDoDia[];
  readonly observacoes: readonly ObservacaoDoDia[];
  /**
   * Os lançamentos de produção vigentes **até o último dia do conjunto**, sem
   * somar e sem filtrar pelo conjunto.
   *
   * São duas perguntas diferentes atendidas pela mesma lista (DP6): o `EXEC.`
   * do período é a parte cuja data pertence ao conjunto; o `ACUM.` é a lista
   * inteira, inclusive os dias de fora. Quem soma é o `rdo`, porque cada número
   * do bloco 7 precisa levar de volta ao lançamento que o compôs.
   */
  readonly producaoAte: readonly LancamentoDeProducaoVigente[];
}

export interface DependenciasDaLeituraDePeriodo {
  readonly repositorio: RepositorioDeLancamento;
  /** Só para a grafia oficial do status; o resto não depende de taxonomia. */
  readonly status: PortaDeStatusDeAtividade;
}

type Leitura<T> = Promise<Result<T, ErroDeDominio>>;

/**
 * Conjunto é conjunto: ordenado, sem repetição.
 *
 * Dia repetido é removido **sem erro** — tocar duas vezes no mesmo RDO na tela
 * não é mentira do usuário —, mas o conjunto normalizado volta no resultado.
 * Sem esta passagem, o mesmo dia dobraria o `EXEC.` e o total de mm
 * (`docs/arquitetura/periodo.md`, 1.2, item 3).
 */
export function normalizaConjuntoDeDias(dias: readonly DiaPuro[]): DiaPuro[] {
  return [...new Set(dias)].sort(comparaDias);
}

/** Agrupa por data. A chave é a string do dia puro, que já ordena como o calendário. */
function agrupaPorDia<L extends LinhaDeLancamento>(
  linhas: readonly L[],
): Map<string, L[]> {
  const porDia = new Map<string, L[]>();
  for (const linha of linhas) {
    const atual = porDia.get(linha.data);
    if (atual === undefined) porDia.set(linha.data, [linha]);
    else atual.push(linha);
  }
  return porDia;
}

const VAZIO: InstantaneoDoPeriodo = {
  diasConsultados: [],
  ate: null,
  dias: [],
  atividades: [],
  pluviometria: [],
  observacoes: [],
  producaoAte: [],
};

export function criaLeituraDePeriodo(deps: DependenciasDaLeituraDePeriodo) {
  const { repositorio, status } = deps;

  /**
   * A grafia oficial do status, resolvida uma vez por termo no conjunto
   * inteiro.
   *
   * Mesma resolução de `casos.ts:listaAtividadesVigentes`, com o cache cobrindo
   * o período e não um dia. Unificar as duas exigiria mexer no caminho do
   * diário, que está entregue e coberto por teste de fidelidade — e o contrato
   * do período (seção 6, item 3) diz para não mexer nele.
   */
  async function termoDoStatus(
    cache: Map<string, string>,
    statusId: AtividadeDoDia['statusId'],
  ): Promise<string> {
    const chave = String(statusId);
    const guardado = cache.get(chave);
    if (guardado !== undefined) return guardado;
    const achado = await status.porId(statusId);
    const termo = achado?.termo ?? '';
    cache.set(chave, termo);
    return termo;
  }

  async function instantaneoDoPeriodo(
    obraId: ObraId,
    dias: readonly DiaPuro[],
  ): Leitura<InstantaneoDoPeriodo> {
    const conjunto = normalizaConjuntoDeDias(dias);
    const ate = conjunto.at(-1);
    // Conjunto vazio não vai ao banco: a resposta é conhecida, e uma consulta
    // sem dia nenhum não tem como ser um instantâneo de coisa alguma.
    if (ate === undefined) return ok(VAZIO);

    // Juntas, de propósito: é o instantâneo único da seção 3.2 do contrato.
    const [linhasDeDia, atividades, pluviometria, observacoes, producao] =
      await Promise.all([
        repositorio.dia.nosDias(obraId, conjunto),
        repositorio.atividades.dosDias(obraId, conjunto),
        repositorio.pluviometria.dosDias(obraId, conjunto),
        repositorio.observacoes.dosDias(obraId, conjunto),
        // O acumulado atravessa o conjunto: é toda a obra até o último dia.
        repositorio.producao.ate(obraId, ate),
      ]);

    const pedidos = new Set<string>(conjunto);
    const atividadesPorDia = agrupaPorDia(atividades);
    const pluviometriaPorDia = agrupaPorDia(pluviometria);
    const observacoesPorDia = agrupaPorDia(observacoes);

    const termos = new Map<string, string>();
    const atividadesDoPeriodo: AtividadeDoDia[] = [];
    const pluviometriaDoPeriodo: PluviometriaDoDia[] = [];
    const observacoesDoPeriodo: ObservacaoDoDia[] = [];

    // Dia a dia, na ordem do calendário. A ordem do bloco 8 é por hora de
    // registro DENTRO do dia (`vigencia.ts`); aplicá-la ao período inteiro
    // misturaria os dias, porque o dia 09 pode ter sido lançado antes do 02.
    for (const dia of conjunto) {
      for (const linha of apenasVigentes(atividadesPorDia.get(dia) ?? [])) {
        atividadesDoPeriodo.push({
          id: linha.id,
          data: linha.data,
          descricao: linha.descricao,
          statusId: linha.statusId,
          statusTermo: await termoDoStatus(termos, linha.statusId),
        });
      }

      // Existe UMA cadeia de pluviometria por dia (índice único do esquema):
      // dia sem leitura não entra, e ausência não é zero.
      const leitura = vigenteDaCadeia(pluviometriaPorDia.get(dia) ?? []);
      if (leitura !== null) {
        pluviometriaDoPeriodo.push({
          id: leitura.id,
          data: leitura.data,
          noiteAnterior: leitura.noiteAnterior,
          manha: leitura.manha,
          tarde: leitura.tarde,
          indiceMm: leitura.indiceMm,
        });
      }

      for (const linha of apenasVigentes(observacoesPorDia.get(dia) ?? [])) {
        observacoesDoPeriodo.push({
          id: linha.id,
          data: linha.data,
          lado: linha.lado,
          texto: linha.texto,
        });
      }
    }

    return ok({
      diasConsultados: conjunto,
      ate,
      // A consulta já filtra por obra e por conjunto; o filtro aqui é a rede
      // que sobra se um dia a consulta mudar de forma.
      dias: linhasDeDia
        .filter((linha) => pedidos.has(linha.data))
        .sort((a, b) => comparaDias(a.data, b.data)),
      atividades: atividadesDoPeriodo,
      pluviometria: pluviometriaDoPeriodo,
      observacoes: observacoesDoPeriodo,
      // Recalculado do zero, sempre: não existe tabela de saldo nem coluna de
      // acumulado. Corrigir março corrige setembro sozinho (R5).
      producaoAte: apenasVigentes(producao)
        .sort((a, b) => comparaDias(a.data, b.data))
        .map((linha) => ({
          id: linha.id,
          servicoId: linha.servicoId,
          data: linha.data,
          quantidade: linha.quantidade,
        })),
    });
  }

  return { instantaneoDoPeriodo };
}

export type LeituraDePeriodo = ReturnType<typeof criaLeituraDePeriodo>;
