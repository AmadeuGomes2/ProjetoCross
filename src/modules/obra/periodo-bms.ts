/**
 * Períodos de BMS — o campo `BM'S` do cabeçalho do RDO.
 *
 * Decisão 7.1, de 16/09/2026: **não existe ciclo fixo**. O engenheiro cadastra
 * os períodos (número, início, fim) e o RDO deriva o número pela data do dia.
 * A tabela legada, que ia de 2022 a 2025 e não cobria 2026, foi descartada.
 *
 * R25 e regras-extraidas §8:
 *
 *     dias do periodo = data final − data inicial + 1
 *
 * O `+ 1` não é detalhe: sem ele, um período de um dia dá zero. E a validação
 * de "final não anterior à inicial" existe porque o BMS 4 da planilha tem
 * **−716 dias** e ninguém viu (caso de teste obrigatório 9).
 */

import { diaEstaNoIntervalo, diferencaEmDias, type DiaPuro } from '../../shared/date/dia';
import {
  intervalosSeSobrepoem,
  ordemDasDatasEstaInvertida,
} from '../../shared/date/intervalo';
import { instanteAgora, type Instante } from '../../shared/date/fuso';
import { geraId, type ObraId, type PeriodoBmsId, type UsuarioId } from '../../shared/id';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import * as repositorio from './repositorio';
import type { Ambiente, AtorDaObra, PeriodoBms, PeriodoBmsNovo } from './tipos';

/**
 * Derivado, nunca gravado. `final − inicial + 1`.
 *
 * Continua **síncrono e de calendário**, não de banco: a conta é de dia puro, e
 * `shared/date` é quem a faz. O `DATE` do Postgres mudou a comparação e a
 * ordenação **dentro** do banco; a aritmética que sai no campo `dias` do
 * cabeçalho nunca passou por lá.
 */
export function diasDoPeriodo(dataInicial: DiaPuro, dataFinal: DiaPuro): number {
  return diferencaEmDias(dataInicial, dataFinal) + 1;
}

/**
 * "Não anterior" inclui o mesmo dia (R14): um período de um dia é válido, e o
 * dia igual é o limite exato do aceite.
 *
 * A comparação mora em `shared/date/intervalo`, como já acontece em `pessoal` e
 * `equipamento`. O que é deste módulo é só a mensagem.
 *
 * Roda **antes** do banco e continua sendo a validação que vale: o `CHECK`
 * `ck_periodo_bms_final_apos_inicial` é a rede, e desde que a coluna é `DATE`
 * ele compara data de verdade — mas quem responde "a data final não pode ser
 * anterior à inicial" em português é esta função, e ela não consulta nada.
 */
export function validaIntervalo(
  dataInicial: DiaPuro,
  dataFinal: DiaPuro,
): Result<void, ErroDeDominio> {
  if (ordemDasDatasEstaInvertida({ inicio: dataInicial, fim: dataFinal })) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL,
        'A data final não pode ser anterior à inicial.',
      ),
    );
  }
  return ok(undefined);
}

/** Período de BMS na forma de intervalo de `shared/date`. Fim sempre fechado. */
function comoIntervalo(p: {
  readonly dataInicial: DiaPuro;
  readonly dataFinal: DiaPuro;
}): { inicio: DiaPuro; fim: DiaPuro } {
  return { inicio: p.dataInicial, fim: p.dataFinal };
}

/**
 * Valida um conjunto de períodos contra si mesmo e contra o que já existe.
 *
 * Sobreposição é recusada (arquitetura, decisão 11 e pergunta P5): o `BM'S` é
 * o que amarra a fatura, e duas respostas para o mesmo dia viram pedido de
 * correção do fiscal. Não é expressável em `CHECK`, por isso mora aqui.
 */
export function validaConjuntoDePeriodos(
  novos: readonly PeriodoBmsNovo[],
  existentes: readonly { numero: number; dataInicial: DiaPuro; dataFinal: DiaPuro }[],
): Result<void, ErroDeDominio> {
  const acumulados = [...existentes];

  for (const periodo of novos) {
    const intervalo = validaIntervalo(periodo.dataInicial, periodo.dataFinal);
    if (!intervalo.ok) return intervalo;

    if (!Number.isInteger(periodo.numero) || periodo.numero < 0) {
      return erro(
        erroDeDominio(
          CODIGO_ERRO.NUMERO_INVALIDO,
          'O número do período de BMS precisa ser um inteiro não negativo.',
        ),
      );
    }

    if (acumulados.some((p) => p.numero === periodo.numero)) {
      return erro(
        erroDeDominio(
          CODIGO_ERRO.JA_EXISTE,
          `Já existe o período de BMS ${periodo.numero} nesta obra.`,
        ),
      );
    }

    // `find`, e não `conflitaComAlgum`: a mensagem diz **qual** período está no
    // caminho, e "se sobrepõe a algum" mandaria o engenheiro procurar. A regra
    // da sobreposição, essa sim, é a de `shared/date/intervalo` — era a
    // terceira cópia dela no sistema, depois de `pessoal` e `equipamento`.
    const conflito = acumulados.find((p) =>
      intervalosSeSobrepoem(comoIntervalo(p), comoIntervalo(periodo)),
    );
    if (conflito !== undefined) {
      return erro(
        erroDeDominio(
          // Sobreposição não é ordem invertida: aquela é um intervalo só, de
          // cabeça para baixo (`validaIntervalo`, acima); esta são dois
          // intervalos brigando pelo mesmo trecho de calendário. O código é
          // chave de log, e o errado fazia o registro contradizer a mensagem.
          CODIGO_ERRO.INTERVALO_SOBREPOSTO,
          `Este intervalo se sobrepõe ao período de BMS ${conflito.numero}. Ajuste as datas.`,
        ),
      );
    }

    acumulados.push(periodo);
  }

  return ok(undefined);
}

/**
 * Grava os períodos. Usado pela criação da obra e pelo cadastro avulso.
 *
 * **Não abre transação, e é de propósito:** quem chama já está dentro de uma.
 * Em `criaObra` a transação segura obra, acesso, períodos e serviços juntos; em
 * `cadastraPeriodoBms` ela segura a conferência de sobreposição e a gravação.
 * Abrir outra aqui aninharia savepoint sem ganho e esconderia de quem lê que a
 * atomicidade é responsabilidade do caso de uso.
 *
 * Em série, e não em `Promise.all`: são vários inserts na mesma transação, e
 * uma transação atende uma consulta de cada vez.
 */
export async function gravaPeriodos(
  db: Ambiente['db'],
  obraId: ObraId,
  novos: readonly PeriodoBmsNovo[],
  criadoPor: UsuarioId,
  criadoEm: Instante,
): Promise<PeriodoBmsId[]> {
  const ids: PeriodoBmsId[] = [];
  for (const periodo of novos) {
    const id = geraId<'periodo_bms'>();
    await repositorio.inserePeriodo(db, {
      id,
      obraId,
      numero: periodo.numero,
      dataInicial: periodo.dataInicial,
      dataFinal: periodo.dataFinal,
      criadoPor,
      criadoEm,
    });
    ids.push(id);
  }
  return ids;
}

export interface ComandoPeriodoBms {
  readonly obraId: ObraId;
  readonly numero: number;
  readonly dataInicial: DiaPuro;
  readonly dataFinal: DiaPuro;
}

/**
 * Cadastra um período avulso, **conferência e gravação na mesma transação**.
 *
 * A sobreposição não é expressável em `CHECK` (ver o rodapé de
 * `src/db/schema/obra.ts`): é um `SELECT` seguido de um `INSERT`. No SQLite
 * síncrono nada podia se intercalar entre os dois; com Postgres pode, e sem a
 * transação dois pedidos simultâneos gravariam dois períodos sobrepostos — duas
 * respostas de `BM'S` para o mesmo dia, que é o que a decisão 11 da arquitetura
 * proíbe porque o `BM'S` amarra a fatura.
 */
export async function cadastraPeriodoBms(
  cmd: ComandoPeriodoBms,
  ator: AtorDaObra,
  amb: Ambiente,
): Promise<Result<PeriodoBmsId, ErroDeDominio>> {
  const criadoEm = instanteAgora(amb.relogio);

  return amb.db.transaction<Result<PeriodoBmsId, ErroDeDominio>>(async (tx) => {
    if ((await repositorio.buscaObra(tx, cmd.obraId)) === null) {
      return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Obra não encontrada.'));
    }

    const existentes = await repositorio.listaPeriodos(tx, cmd.obraId);
    const conferencia = validaConjuntoDePeriodos([cmd], existentes);
    if (!conferencia.ok) return erro(conferencia.erro);

    const ids = await gravaPeriodos(tx, cmd.obraId, [cmd], ator.usuarioId, criadoEm);
    const id = ids[0];
    if (id === undefined) {
      return erro(
        erroDeDominio(
          CODIGO_ERRO.NAO_ENCONTRADO,
          'Não foi possível cadastrar o período.',
        ),
      );
    }
    return ok(id);
  });
}

export async function listaPeriodosBms(
  obraId: ObraId,
  amb: Ambiente,
): Promise<Result<PeriodoBms[], ErroDeDominio>> {
  const periodos = await repositorio.listaPeriodos(amb.db, obraId);
  return ok(
    periodos.map((p) => ({
      id: p.id,
      numero: p.numero,
      dataInicial: p.dataInicial,
      dataFinal: p.dataFinal,
      dias: diasDoPeriodo(p.dataInicial, p.dataFinal),
    })),
  );
}

/**
 * O `BM'S` do cabeçalho: o número do período cujo intervalo contém a data.
 *
 * Fronteiras que importam: o **primeiro** e o **último** dia do intervalo são
 * do período (CT-023, CT-024). É o mesmo erro de `<` contra `≤` que a planilha
 * comete no efetivo, agora no intervalo do BMS.
 *
 * Data não coberta devolve `null` **sem erro** (decisão 21.1): o campo sai
 * vazio, a tela avisa e o RDO é gerado. A planilha imprime um 7 arbitrário sem
 * tabela que o sustente; vazio com aviso é honesto, número inventado não é.
 *
 * **Uma consulta, sempre.** Está no caminho do RDO diário, que é quente: a
 * busca traz os períodos da obra de uma vez e o intervalo é decidido em
 * memória, pela mesma `diaEstaNoIntervalo` de `shared/date`. Empurrar o
 * intervalo para um `WHERE` por dia daria uma ida à rede por dia consultado, e
 * o RDO de um período pergunta o `BM'S` de cada dia da lista. Uma obra tem
 * dezenas de períodos, não milhares.
 */
export async function resolveBmsDoDia(
  obraId: ObraId,
  dia: DiaPuro,
  amb: Ambiente,
): Promise<Result<number | null, ErroDeDominio>> {
  const periodos = await repositorio.listaPeriodos(amb.db, obraId);
  const periodo = periodos.find((p) =>
    diaEstaNoIntervalo(dia, p.dataInicial, p.dataFinal),
  );
  return ok(periodo?.numero ?? null);
}

/**
 * Editar um período (17/09/2026).
 *
 * A conferência de conjunto roda **sem o próprio período na lista de
 * existentes**. Sem isso, salvar o BM'S 7 sem mudar nada devolveria "já existe
 * o período de BMS 7 nesta obra": ele colidiria consigo mesmo.
 *
 * Alterar as datas **não toca em lançamento nenhum**. O que muda é qual número
 * de BM'S sai no cabeçalho dos RDOs daqueles dias, porque `resolveBmsDoDia`
 * resolve por data a cada consulta. Quem chama avisa o tamanho disso antes
 * (`_composicao/impacto.ts`).
 *
 * Mesma razão de `cadastraPeriodoBms` para a transação: a conferência de
 * sobreposição é `SELECT` seguido de `UPDATE`, e o que os mantinha indivisíveis
 * era a sincronia do SQLite, que acabou.
 */
export async function atualizaPeriodoBms(
  cmd: ComandoPeriodoBms & { readonly periodoId: PeriodoBmsId },
  amb: Ambiente,
): Promise<Result<void, ErroDeDominio>> {
  return amb.db.transaction<Result<void, ErroDeDominio>>(async (tx) => {
    if ((await repositorio.buscaObra(tx, cmd.obraId)) === null) {
      return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Obra não encontrada.'));
    }

    const existentes = await repositorio.listaPeriodos(tx, cmd.obraId);
    if (!existentes.some((p) => p.id === cmd.periodoId)) {
      return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Período não encontrado.'));
    }

    const outros = existentes.filter((p) => p.id !== cmd.periodoId);
    const conferencia = validaConjuntoDePeriodos([cmd], outros);
    if (!conferencia.ok) return erro(conferencia.erro);

    await repositorio.atualizaPeriodo(tx, cmd.obraId, cmd.periodoId, {
      numero: cmd.numero,
      dataInicial: cmd.dataInicial,
      dataFinal: cmd.dataFinal,
    });
    return ok(undefined);
  });
}

/**
 * Excluir um período (17/09/2026).
 *
 * **Não bloqueia por haver dia lançado dentro dele.** O dia continua lançado, o
 * RDO continua sendo gerado, e o campo `BM'S` passa a sair vazio com aviso —
 * exatamente o que a decisão 21.1 já definiu para dia fora de qualquer período.
 * Bloquear seria inventar uma trava que a regra não pede, e deixaria o
 * engenheiro preso a um período digitado errado.
 *
 * Quem chama mostra o tamanho do impacto antes (`_composicao/impacto.ts`).
 */
export async function excluiPeriodoBms(
  obraId: ObraId,
  periodoId: PeriodoBmsId,
  amb: Ambiente,
): Promise<Result<void, ErroDeDominio>> {
  const existentes = await repositorio.listaPeriodos(amb.db, obraId);
  if (!existentes.some((p) => p.id === periodoId)) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Período não encontrado.'));
  }

  // Sem transação, ao contrário de cadastrar e de editar: aqui a leitura só
  // escolhe a mensagem. O `DELETE` já carrega o `obra_id` e o `id` no `WHERE`,
  // então dois pedidos simultâneos apagam a mesma linha uma vez só.
  await repositorio.excluiPeriodo(amb.db, obraId, periodoId);
  return ok(undefined);
}
