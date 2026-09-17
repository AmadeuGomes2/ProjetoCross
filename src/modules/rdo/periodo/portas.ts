/**
 * As portas do RDO de período.
 *
 * Como as do diário (`../portas.ts`), são **tipo de função**: o módulo `rdo`
 * não lê tabela e não conhece outro módulo. Quem produz o dado exporta uma
 * função com a mesma forma, e a ligação acontece em `src/app/_composicao/`.
 *
 * Todas continuam **sem campo de nome e sem campo de autor**: o que não chega
 * ao módulo não vaza para a tela, para o PDF nem para o Excel.
 *
 * **Por que não são as portas do diário chamadas N vezes**
 * (`docs/arquitetura/periodo.md`, 3.2):
 *
 * 1. **Determinismo.** Trinta dias por `PortasDoRdo` são ~360 consultas
 *    separadas, e uma retificação concorrente no meio delas faz o dia 02 vir de
 *    antes e o dia 09 de depois. O consolidado sairia com dois instantâneos no
 *    mesmo documento, em desacordo com os diários que ele anexa. Porta que
 *    recebe o conjunto é um instantâneo só.
 * 2. **Custo, que aqui é superfície de ataque.** Cinco portas não dependem do
 *    dia; chamá-las N vezes repete a mesma consulta N vezes e desfaz a defesa
 *    do teto de 366 dias.
 * 3. **Assimetria do domínio.** `ACUM.` é uma leitura só, até o último dia;
 *    `BM'S` é o conjunto de faixas que os dias cobrem. Nenhum dos dois é
 *    "uma chamada por dia".
 */

import type { DiaPuro } from '../../../shared/date/dia';
import type { ObraId } from '../../../shared/id';
import type { ErroDeDominio, Result } from '../../../shared/result';
import type {
  AtividadeDoDia,
  CabecalhoDaObra,
  DiaDeObra,
  EquipamentoMobilizado,
  FuncaoParaEfetivo,
  LancamentoDeProducao,
  ObservacaoDoDia,
  PessoaMobilizada,
  PluviometriaDoDia,
  ServicoControladoComProjeto,
} from '../portas';

/** Um registro de dia, com a data a que pertence. */
export type RegistroDeDiaDoConjunto = DiaDeObra & { readonly dia: DiaPuro };

export type AtividadeDeUmDia = AtividadeDoDia & { readonly data: DiaPuro };
export type PluviometriaDeUmDia = PluviometriaDoDia & { readonly data: DiaPuro };
export type ObservacaoDeUmDia = ObservacaoDoDia & { readonly data: DiaPuro };

/**
 * Uma faixa de BMS cadastrada (decisão 7.1).
 *
 * O casamento com os dias acontece em memória, em `resolveBmsDosDias`: é a irmã
 * plural de `resolveBmsDoDia`, e não é a mesma consulta N vezes.
 */
export interface FaixaDeBms {
  readonly numero: number;
  readonly dataInicial: DiaPuro;
  readonly dataFinal: DiaPuro;
}

export interface PortasDoRdoDePeriodo {
  // Idênticas às do diário e chamadas UMA vez: não dependem do dia.
  readonly cabecalho: (obraId: ObraId) => Promise<Result<CabecalhoDaObra, ErroDeDominio>>;
  readonly funcoes: (
    obraId: ObraId,
  ) => Promise<Result<readonly FuncaoParaEfetivo[], ErroDeDominio>>;
  readonly pessoalMobilizado: (
    obraId: ObraId,
  ) => Promise<Result<readonly PessoaMobilizada[], ErroDeDominio>>;
  readonly equipamentosMobilizados: (
    obraId: ObraId,
  ) => Promise<Result<readonly EquipamentoMobilizado[], ErroDeDominio>>;
  readonly servicos: (
    obraId: ObraId,
  ) => Promise<Result<readonly ServicoControladoComProjeto[], ErroDeDominio>>;

  /** Reaproveitada sem mudança: o `ACUM.` de DP6 é exatamente ela no último dia. */
  readonly lancamentosDeProducaoAte: (
    obraId: ObraId,
    dia: DiaPuro,
  ) => Promise<Result<readonly LancamentoDeProducao[], ErroDeDominio>>;

  // Plurais: recebem o CONJUNTO, e não um intervalo.
  readonly periodosBms: (
    obraId: ObraId,
  ) => Promise<Result<readonly FaixaDeBms[], ErroDeDominio>>;
  readonly diasDeObra: (
    obraId: ObraId,
    dias: readonly DiaPuro[],
  ) => Promise<Result<readonly RegistroDeDiaDoConjunto[], ErroDeDominio>>;
  readonly atividadesDosDias: (
    obraId: ObraId,
    dias: readonly DiaPuro[],
  ) => Promise<Result<readonly AtividadeDeUmDia[], ErroDeDominio>>;
  readonly pluviometriaDosDias: (
    obraId: ObraId,
    dias: readonly DiaPuro[],
  ) => Promise<Result<readonly PluviometriaDeUmDia[], ErroDeDominio>>;
  /**
   * Só o lado CROS existe na v1 (decisão 10.1). Cada bloco lê a SUA fonte: o
   * defeito C10 da planilha, em que o rótulo diz CROS e a fórmula lê a aba do
   * contratante, não se herda.
   */
  readonly observacoesCrosDosDias: (
    obraId: ObraId,
    dias: readonly DiaPuro[],
  ) => Promise<Result<readonly ObservacaoDeUmDia[], ErroDeDominio>>;
}
