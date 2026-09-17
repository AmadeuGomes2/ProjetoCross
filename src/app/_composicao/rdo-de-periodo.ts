/**
 * Raiz de composição do RDO de período. **As portas estão ligadas.**
 *
 * `docs/arquitetura/periodo.md`, 3.1, define `PortasDoRdoDePeriodo`. O tipo
 * mora no módulo `rdo` (passo zero do coordenador); esta frente produz funções
 * **com a mesma forma, sem importar o tipo** — é a tipagem estrutural que
 * confere, e é aqui que a conferência acontece (contrato, seção 5).
 *
 * ## Ordem obrigatória: autorizar, depois ler
 *
 * `portasDoRdoDePeriodoProtegidas` é a **única entrada pública** deste arquivo,
 * e ela começa por `exigeAcessoNaObra`. Quem não passa por ela não recebe porta
 * nenhuma, e portanto não lê lançamento nenhum. É o padrão de
 * `painelDosUltimosDiasProtegido` (`lancamento.ts`) e de `consultaRdoProtegida`
 * (`rdo-diario.ts`), e existe porque esconder o botão na interface não é
 * controle de acesso.
 *
 * **O perfil exigido é `engenheiro`** (decisão 27.1, e PP-1 do contrato): o
 * consolidado é o que se entrega ao fiscal, carrega observação em texto livre e
 * o registro profissional do responsável técnico. O encarregado lança o dia.
 * Abrir depois é uma linha; fechar depois é tarde.
 *
 * ## Um instantâneo, e um conjunto
 *
 * As portas nascem **presas ao conjunto de dias e à obra autorizada**: a
 * leitura acontece uma vez, e as quatro portas plurais mais a da produção
 * respondem da mesma foto. É o que impede o consolidado de discordar dos
 * diários que ele anexa (contrato, 3.2). Pedir um conjunto diferente do que foi
 * autorizado é recusado, e não respondido pela metade: corte silencioso é
 * defeito.
 *
 * As portas que **não dependem do dia** — cabeçalho, funções, mobilização de
 * pessoal e de equipamento, serviços — são as do diário, reaproveitadas de
 * `criaPortasDoRdo`. Cinco consultas, não cinco por dia. O que se acrescenta a
 * elas é só a amarra da obra autorizada: no diário elas rodam dentro da
 * fronteira, aqui o objeto de portas atravessa para outro módulo.
 */

import { listaPeriodosBms } from '../../modules/obra';
import { criaLeituraDePeriodo, normalizaConjuntoDeDias } from '../../modules/lancamento';
import type { InstantaneoDoPeriodo } from '../../modules/lancamento';
import { criaRepositorioDrizzle } from '../../modules/lancamento/repositorio-drizzle';
import { exigeAcessoNaObra, type PortadorDeAcesso } from '../../modules/acesso';
import { comparaDias, type DiaPuro } from '../../shared/date/dia';
import type { Quantidade } from '../../shared/decimal';
import {
  idConfiavel,
  type LancamentoId,
  type ObraId,
  type ServicoControladoId,
} from '../../shared/id';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import type { EstadoDoDia, LetraDeTurno } from '../../shared/taxonomia';
import { ambienteDaComposicao, type AmbienteDaComposicao } from './ambiente';
import { paraAcesso, paraObra } from './ambiente-de-cadastro';
import { portasDeLancamento } from './lancamento';
import { criaPortasDoRdo } from './rdo-diario';

/**
 * O período de BMS como faixa, para o `BM'S` do consolidado.
 *
 * O casamento com os dias acontece em memória, no `rdo`: `BM'S` não é por dia,
 * é o conjunto de faixas que os dias cobrem (DP7).
 */
export interface FaixaDeBms {
  readonly numero: number;
  readonly dataInicial: DiaPuro;
  readonly dataFinal: DiaPuro;
}

/**
 * O registro do dia dentro do conjunto. **Só existe para dia lançado.**
 *
 * Dia não lançado não vira elemento com estado fabricado: ele é a diferença
 * entre o conjunto pedido e esta lista (decisão 4.2).
 */
export interface RegistroDeDiaDoConjunto {
  readonly dia: DiaPuro;
  readonly estado: EstadoDoDia;
  readonly motivoParada: string | null;
  readonly numeroRdoCongelado: number | null;
  readonly eDiaFechado: boolean;
}

/** Igual à atividade do diário, mais a data: no período ela separa os grupos. */
export interface AtividadeDeUmDia {
  readonly data: DiaPuro;
  readonly lancamentoId: LancamentoId;
  readonly descricao: string;
  readonly status: string;
}

export interface PluviometriaDeUmDia {
  readonly data: DiaPuro;
  readonly noiteAnterior: LetraDeTurno | null;
  readonly manha: LetraDeTurno | null;
  readonly tarde: LetraDeTurno | null;
  readonly indiceMm: Quantidade;
}

export interface ObservacaoDeUmDia {
  readonly data: DiaPuro;
  readonly lancamentoId: LancamentoId;
  readonly texto: string;
}

export interface LancamentoDeProducaoDoPeriodo {
  readonly lancamentoId: LancamentoId;
  readonly servicoId: ServicoControladoId;
  readonly data: DiaPuro;
  readonly quantidade: Quantidade;
}

type Porta<T> = Promise<Result<T, ErroDeDominio>>;

type PortasDoDiario = ReturnType<typeof criaPortasDoRdo>;

/**
 * A forma de `PortasDoRdoDePeriodo` (contrato, 3.1).
 *
 * As plurais recebem o conjunto inteiro; nenhuma recebe um dia só. Nenhuma tem
 * campo de nome de trabalhador nem de autor de lançamento, pela mesma razão do
 * diário: o que não chega ao módulo não vaza para o papel.
 */
export interface PortasDoRdoDePeriodo {
  readonly cabecalho: PortasDoDiario['cabecalho'];
  readonly funcoes: PortasDoDiario['funcoes'];
  readonly pessoalMobilizado: PortasDoDiario['pessoalMobilizado'];
  readonly equipamentosMobilizados: PortasDoDiario['equipamentosMobilizados'];
  readonly servicos: PortasDoDiario['servicos'];
  readonly lancamentosDeProducaoAte: (
    obraId: ObraId,
    dia: DiaPuro,
  ) => Porta<readonly LancamentoDeProducaoDoPeriodo[]>;
  readonly periodosBms: (obraId: ObraId) => Porta<readonly FaixaDeBms[]>;
  readonly diasDeObra: (
    obraId: ObraId,
    dias: readonly DiaPuro[],
  ) => Porta<readonly RegistroDeDiaDoConjunto[]>;
  readonly atividadesDosDias: (
    obraId: ObraId,
    dias: readonly DiaPuro[],
  ) => Porta<readonly AtividadeDeUmDia[]>;
  readonly pluviometriaDosDias: (
    obraId: ObraId,
    dias: readonly DiaPuro[],
  ) => Porta<readonly PluviometriaDeUmDia[]>;
  readonly observacoesCrosDosDias: (
    obraId: ObraId,
    dias: readonly DiaPuro[],
  ) => Porta<readonly ObservacaoDeUmDia[]>;
}

const ERRO_OUTRA_OBRA: ErroDeDominio = erroDeDominio(
  CODIGO_ERRO.SEM_PERMISSAO,
  'Esta consulta pertence a outra obra. Abra o relatório pela obra correta.',
);

const ERRO_OUTRO_CONJUNTO: ErroDeDominio = erroDeDominio(
  CODIGO_ERRO.NAO_ENCONTRADO,
  'Os dias pedidos não são os do relatório aberto. Refaça a consulta com os dias desejados.',
);

const ERRO_ALEM_DO_CONJUNTO: ErroDeDominio = erroDeDominio(
  CODIGO_ERRO.NAO_ENCONTRADO,
  'O acumulado só vai até o último dia do relatório. Refaça a consulta incluindo o dia desejado.',
);

/**
 * Duas listas de dias são o mesmo conjunto?
 *
 * A normalização é a **mesma** que produziu o instantâneo, importada e não
 * recopiada: duas normalizações divergentes fariam esta conferência recusar um
 * pedido idêntico ao que foi lido.
 */
function mesmoConjunto(a: readonly DiaPuro[], b: readonly DiaPuro[]): boolean {
  const umA = normalizaConjuntoDeDias(a);
  const umB = normalizaConjuntoDeDias(b);
  return umA.length === umB.length && umA.every((dia, i) => dia === umB[i]);
}

/**
 * As portas do período, presas à obra autorizada e ao conjunto já lido.
 *
 * Não é exportada: quem monta portas sem passar pela autorização publica o
 * bloco de observações e o registro profissional do responsável técnico num
 * endereço adivinhável, que foi o CRÍTICO 1 do laudo de 16/09/2026.
 */
function portasSobreOInstantaneo(
  obraAutorizada: ObraId,
  instantaneo: InstantaneoDoPeriodo,
  doDiario: PortasDoDiario,
  ambiente: AmbienteDaComposicao,
): PortasDoRdoDePeriodo {
  function confere(
    obraId: ObraId,
    dias: readonly DiaPuro[],
  ): Result<void, ErroDeDominio> {
    if (obraId !== obraAutorizada) return erro(ERRO_OUTRA_OBRA);
    if (!mesmoConjunto(dias, instantaneo.diasConsultados)) {
      return erro(ERRO_OUTRO_CONJUNTO);
    }
    return ok(undefined);
  }

  /**
   * As portas do diário não verificam obra — elas nascem do lado de dentro da
   * fronteira, e quem autoriza é quem as monta. Aqui elas atravessam para outro
   * módulo, então recebem a amarra: o `obraId` é argumento, e argumento é
   * hostil. Sem isto, quem tem acesso a uma obra leria o cabeçalho de outra,
   * com o registro profissional do responsável técnico, passando outro id.
   */
  function presaAObra<T>(
    porta: (obraId: ObraId) => Porta<T>,
  ): (obraId: ObraId) => Porta<T> {
    return async (obraId) =>
      obraId === obraAutorizada ? porta(obraId) : erro(ERRO_OUTRA_OBRA);
  }

  return {
    cabecalho: presaAObra(doDiario.cabecalho),
    funcoes: presaAObra(doDiario.funcoes),
    pessoalMobilizado: presaAObra(doDiario.pessoalMobilizado),
    equipamentosMobilizados: presaAObra(doDiario.equipamentosMobilizados),
    servicos: presaAObra(doDiario.servicos),

    periodosBms: presaAObra(async (obraId) => {
      const lista = listaPeriodosBms(obraId, paraObra(ambiente.cadastro));
      if (!lista.ok) return lista;
      return ok(
        lista.valor.map((p) => ({
          numero: p.numero,
          dataInicial: p.dataInicial,
          dataFinal: p.dataFinal,
        })),
      );
    }),

    /**
     * O `ACUM.` de DP6 sai do mesmo instantâneo: a lista foi lida até o último
     * dia do conjunto, e aqui ela só é cortada na data pedida. Pedir depois do
     * último dia devolveria um acumulado incompleto, e por isso é recusado em
     * vez de respondido pela metade.
     */
    lancamentosDeProducaoAte: async (obraId, dia) => {
      if (obraId !== obraAutorizada) return erro(ERRO_OUTRA_OBRA);
      if (instantaneo.ate === null || comparaDias(dia, instantaneo.ate) > 0) {
        return erro(ERRO_ALEM_DO_CONJUNTO);
      }
      return ok(
        instantaneo.producaoAte
          .filter((p) => comparaDias(p.data, dia) <= 0)
          .map((p) => ({
            lancamentoId: p.id,
            servicoId: p.servicoId,
            data: p.data,
            quantidade: p.quantidade,
          })),
      );
    },

    diasDeObra: async (obraId, dias) => {
      const conferido = confere(obraId, dias);
      if (!conferido.ok) return conferido;
      return ok(
        instantaneo.dias.map((d) => ({
          dia: d.data,
          estado: d.estado,
          motivoParada: d.motivoParada,
          numeroRdoCongelado: d.numeroRdoCongelado,
          // O dia está fechado pelo instante do fechamento, não por quem fechou.
          eDiaFechado: d.fechadoEm !== null,
        })),
      );
    },

    atividadesDosDias: async (obraId, dias) => {
      const conferido = confere(obraId, dias);
      if (!conferido.ok) return conferido;
      // O autor não atravessa: o bloco 8 não mostra quem lançou (decisão 14.0).
      return ok(
        instantaneo.atividades.map((a) => ({
          data: a.data,
          lancamentoId: a.id,
          descricao: a.descricao,
          status: a.statusTermo,
        })),
      );
    },

    pluviometriaDosDias: async (obraId, dias) => {
      const conferido = confere(obraId, dias);
      if (!conferido.ok) return conferido;
      return ok(
        instantaneo.pluviometria.map((p) => ({
          data: p.data,
          noiteAnterior: p.noiteAnterior,
          manha: p.manha,
          tarde: p.tarde,
          indiceMm: p.indiceMm,
        })),
      );
    },

    observacoesCrosDosDias: async (obraId, dias) => {
      const conferido = confere(obraId, dias);
      if (!conferido.ok) return conferido;
      // Cada bloco lê a SUA fonte: o defeito C10 da planilha, em que o rótulo
      // diz CROS e a fórmula lê a aba do contratante, não se herda.
      return ok(
        instantaneo.observacoes.map((o) => ({
          data: o.data,
          lancamentoId: o.id,
          texto: o.texto,
        })),
      );
    },
  };
}

/**
 * Ler o período de uma obra. **A única entrada deste arquivo.**
 *
 * A ordem é autorizar e só então ler: quem não tem acesso à obra não descobre
 * nem que ela existe. Obra inexistente e obra sem acesso devolvem o mesmo erro,
 * e a mensagem não carrega nome de pessoa (CLAUDE.md, Segurança).
 *
 * O `obraId` vem da borda e é hostil: aqui ele só ganha a marca de tipo, e quem
 * responde se ele existe é `exigeAcessoNaObra`, contra a tabela `acesso`, em
 * toda chamada e sem cache.
 */
export async function portasDoRdoDePeriodoProtegidas(
  /*
   * `PortadorDeAcesso`, e não `Ator`: a verificação só precisa do id de quem
   * age, e é ele que vai à tabela `acesso`. Exigir a sessão obrigaria a rota a
   * inventar uma — foi o que quase aconteceu ao ligar a exportação de período.
   */
  ator: PortadorDeAcesso,
  obraIdBruto: string,
  dias: readonly DiaPuro[],
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): Promise<Result<PortasDoRdoDePeriodo, ErroDeDominio>> {
  const obraId: ObraId = idConfiavel<'obra'>(obraIdBruto);

  const permitido = exigeAcessoNaObra(
    ator,
    obraId,
    'engenheiro',
    paraAcesso(ambiente.cadastro),
  );
  if (!permitido.ok) {
    return erro(erroDeDominio(permitido.erro.codigo, permitido.erro.mensagem));
  }

  const leitura = criaLeituraDePeriodo({
    repositorio: criaRepositorioDrizzle(ambiente.conexao),
    status: portasDeLancamento(ambiente).status,
  });
  const instantaneo = await leitura.instantaneoDoPeriodo(obraId, dias);
  if (!instantaneo.ok) return instantaneo;

  return ok(
    portasSobreOInstantaneo(
      obraId,
      instantaneo.valor,
      criaPortasDoRdo(ambiente),
      ambiente,
    ),
  );
}
