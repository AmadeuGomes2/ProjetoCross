/**
 * O RDO de período — o consolidado de um **conjunto de dias**.
 *
 * Forma definida em `docs/arquitetura/periodo.md`, seção 2. Como o diário,
 * este tipo é resultado de cálculo e **não tem tabela** (R5): não existe
 * cache de média, de total de mm nem de acumulado.
 *
 * Três propriedades verificáveis por inspeção, herdadas de `../tipos.ts`:
 *
 * - **nenhum campo de nome de trabalhador nem de autor.** O efetivo agrega por
 *   função e por identificador de equipamento, e nada mais chega até aqui;
 * - **campo cru mais `campoTexto`**: o cru é para quem calcula e para o teste,
 *   o texto é para que tela, PDF e Excel não divirjam;
 * - contagem inteira **não** tem `Texto`: `String(n)` não é decisão de
 *   formatação.
 *
 * Não existe `resumoDoDia` aqui: resumo é de um dia. No período o que existe é
 * a contagem de dias por letra. Também não existe `transbordo`: os limites de
 * `../limites.ts` são do gabarito de **um** dia (contrato, decisão 15).
 */

import type { DiaPuro } from '../../../shared/date/dia';
import type { Quantidade } from '../../../shared/decimal';
import type { LancamentoId, ObraId, ServicoControladoId } from '../../../shared/id';
import type { ResponsavelTecnico } from '../portas';
import type {
  CaracteristicasDoProjeto,
  CodigoDeAviso,
  EstadoDoRdo,
  InformacoesGerais,
  LinhaDeAtividade,
} from '../tipos';

export interface IdentificacaoDoPeriodo {
  /** O conjunto **normalizado**, devolvido para a tela conferir o que foi usado. */
  readonly dias: readonly DiaPuro[];
  readonly quantidadeDeDias: number;
  /** Quantos dias do conjunto têm registro de dia. É o divisor de DP2. */
  readonly diasLancados: number;
  readonly primeiroDia: DiaPuro;
  /** Data de corte do `ACUM.` (DP6). */
  readonly ultimoDia: DiaPuro;
  /** `02/09/2026 a 09/09/2026`. Sempre faixa, sempre `dd/mm/aaaa`. */
  readonly periodoTexto: string;
  readonly eContiguo: boolean;
  /**
   * **Menor** número calculado, não o número do primeiro dia.
   *
   * Parece a mesma coisa e não é: a decisão 6.2 congela o número no
   * fechamento, e se a data de início da obra mudar depois disso, o número
   * congelado de um dia fechado deixa de ser monótono em relação ao calculado
   * de um dia aberto. `min`/`max` continuam certos nos dois mundos.
   */
  readonly numeroDoRdoInicial: number;
  readonly numeroDoRdoFinal: number;
  /**
   * Os números dos RDOs do conjunto, em ordem, **um por dia escolhido**.
   *
   * Decisão do dono do produto, 17/09/2026: o documento traz a **lista**, nunca
   * a faixa. Faixa afirma continuidade onde o conjunto pode ter buraco — `209 a
   * 216` para {02, 05, 09} faria o fiscal ler oito dias onde houve três, num
   * papel que sustenta medição.
   *
   * `numeroDoRdoInicial` e `numeroDoRdoFinal` continuam, porque ordenar e
   * comparar períodos precisa deles; o que saiu foi o **texto** de faixa, que
   * era o que ia para o papel.
   */
  readonly numerosDoRdo: readonly number[];
  /** `209, 212, 216`; com um dia só, `209`. */
  readonly numerosDoRdoTexto: string;
  /** Todos os BMS que o conjunto cobre, crescente e sem repetição (DP7). */
  readonly bms: readonly number[];
  /** `3, 4`; vazio quando nenhum período cobre dia nenhum. */
  readonly bmsTexto: string;
}

export interface ColunaDeEfetivoMedio {
  /** Id do cadastro, para a chave de renderização. Nunca um nome. */
  readonly chave: string;
  readonly rotulo: string;
  /** Numerador: soma dos efetivos dos dias considerados. Sempre inteiro. */
  readonly somaDoPeriodo: number;
  /** `null` é **ausência de divisor**, não zero. */
  readonly mediaPorDia: Quantidade | null;
  /** Uma casa decimal; vazio quando zero ou sem divisor, como o gabarito. */
  readonly mediaTexto: string;
}

export interface BlocoDeEfetivoMedio {
  readonly colunas: readonly ColunaDeEfetivoMedio[];
  /**
   * O divisor de DP2: dias do conjunto **com registro**. Dia não lançado fica
   * fora; dia parado fica dentro, com efetivo zero (decisão 5.1), e portanto
   * puxa a média para baixo. É consequência querida das duas decisões juntas.
   */
  readonly diasConsiderados: number;
  /**
   * Calculada sobre os **totais diários**, nunca somando as médias já
   * arredondadas das colunas. As duas contas são iguais na álgebra e diferem no
   * arredondamento; "consertar" o total para bater com a soma exibida é o
   * defeito de planilha que não se herda.
   */
  readonly mediaTotal: Quantidade | null;
  readonly mediaTotalTexto: string;
}

export interface LinhaDeProducaoDoPeriodo {
  readonly servicoId: ServicoControladoId;
  readonly nome: string;
  /**
   * Soma dos lançamentos cuja data **pertence ao conjunto**. Não é
   * `data >= primeiro && data <= ultimo`: para `{02, 05, 09}` o dia 03 fica de
   * fora. É o ponto em que um tipo de intervalo teria mentido (DP1).
   */
  readonly executadoNoPeriodo: Quantidade;
  readonly executadoTexto: string;
  /**
   * Acumulado da obra até `ultimoDia`, inclusive, sobre **todos** os dias —
   * inclusive os que não estão no conjunto (DP6). Recalculado do zero (R5).
   */
  readonly acumulado: Quantidade;
  readonly acumuladoTexto: string;
  readonly projeto: Quantidade;
  readonly projetoTexto: string;
  readonly percentualTexto: string;
  /** Fração do projeto, para a barra de progresso. 1 é 100%. */
  readonly fracaoDoProjeto: number;
  /** `>`, nunca `>=`: serviço concluído não nasce marcado como estourado. */
  readonly acumuladoAcimaDoProjeto: boolean;
  readonly lancamentosDoExecutado: readonly LancamentoId[];
  readonly lancamentosDoAcumulado: readonly LancamentoId[];
}

/**
 * As atividades de um dia do conjunto.
 *
 * Dia `não lançado` gera grupo **vazio** e não some da lista: sumir seria corte
 * silencioso, e quem lê precisa ver que 05/09 não foi lançado em vez de deduzir
 * do buraco na sequência.
 */
export interface GrupoDeAtividadesDoDia {
  readonly dia: DiaPuro;
  readonly dataBr: string;
  readonly numeroDoRdo: number;
  readonly estado: EstadoDoRdo;
  readonly linhas: readonly LinhaDeAtividade[];
}

export interface PluviometriaDoPeriodo {
  /** Soma do índice dos dias **com lançamento**. Ausência não é zero. */
  readonly totalMm: Quantidade;
  readonly totalMmTexto: string;
  readonly diasB: number;
  readonly diasC: number;
  readonly diasI: number;
  readonly diasSemLeitura: number;
  /**
   * Vem do **estado do dia**, não da pluviometria. Está neste bloco porque DP4
   * descreve o bloco do documento assim; a fonte é `diasDeObra`.
   */
  readonly diasParados: number;
}

export interface GrupoDeObservacoesDoDia {
  readonly dia: DiaPuro;
  readonly dataBr: string;
  /** Como foram escritas, para a tela. */
  readonly textos: readonly string[];
  /** Quebradas na largura do bloco, para o papel. */
  readonly linhas: readonly string[];
}

/**
 * Códigos de aviso que só existem no período. São **de tela**: nunca entram no
 * documento, como os do diário.
 */
export const AVISO_DO_PERIODO = {
  /** `eContiguo === false`; a faixa de RDO sugere continuidade que não existe. */
  CONJUNTO_NAO_CONTIGUO: 'CONJUNTO_NAO_CONTIGUO',
  DIAS_NAO_LANCADOS: 'DIAS_NAO_LANCADOS',
  /** `diasLancados === 0`; não há divisor para a média. */
  PERIODO_SEM_DIA_LANCADO: 'PERIODO_SEM_DIA_LANCADO',
} as const;

export type CodigoDeAvisoDoPeriodo =
  CodigoDeAviso | (typeof AVISO_DO_PERIODO)[keyof typeof AVISO_DO_PERIODO];

/**
 * Aviso do consolidado.
 *
 * Reaproveita os códigos do diário (`AVISO_DO_RDO`) e acrescenta três. Não é o
 * mesmo tipo porque acrescentar código em `../tipos.ts` seria editar o diário
 * já entregue, o que o contrato proíbe (seção 6.3). `AvisoDoRdo` é
 * estruturalmente atribuível a este tipo, então nada precisa ser convertido.
 */
export interface AvisoDoPeriodo {
  readonly codigo: CodigoDeAvisoDoPeriodo;
  readonly mensagem: string;
  readonly servicoId: ServicoControladoId | null;
}

export interface RdoDePeriodo {
  readonly obraId: ObraId;
  readonly identificacao: IdentificacaoDoPeriodo;
  readonly informacoesGerais: InformacoesGerais;
  readonly caracteristicasDoProjeto: CaracteristicasDoProjeto;
  /** O **vigente** (DP8), lido uma vez do cabeçalho da obra. */
  readonly responsavelTecnico: ResponsavelTecnico | null;
  readonly efetivoPessoal: BlocoDeEfetivoMedio;
  readonly efetivoEquipamentos: BlocoDeEfetivoMedio;
  readonly producao: readonly LinhaDeProducaoDoPeriodo[];
  /** Todas, por data, em ordem crescente de dia. Nada agrupado nem deduplicado. */
  readonly atividades: readonly GrupoDeAtividadesDoDia[];
  readonly pluviometria: PluviometriaDoPeriodo;
  readonly comentariosCros: readonly GrupoDeObservacoesDoDia[];
  /** Decisão 10.1: aparece com o rótulo e sempre vazio na v1. */
  readonly comentarioContratante: readonly string[];
  /** Só tela: nunca entra no documento. */
  readonly avisos: readonly AvisoDoPeriodo[];
}
