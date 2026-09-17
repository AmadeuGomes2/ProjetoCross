/**
 * O que o documento de período recebe, e o que ele devolve à trilha.
 *
 * `docs/arquitetura/periodo.md`, 4.2: o `export` recebe um
 * **`PacoteParaDocumento`**, união discriminada pelos três modos de DP9. Não é
 * um objeto com dois campos anuláveis: `{ consolidado: null, diarios: [] }`
 * seria um pacote vazio que compila, e alguém acabaria gerando um PDF de zero
 * páginas com a trilha já gravada.
 *
 * Como no diário (`../portas.ts`), **tudo é texto pronto para imprimir**. As
 * duas exceções são as mesmas de lá, e pela mesma razão: `fracao` é número
 * porque desenha barra, e contagem inteira é número porque `String(n)` não é
 * decisão de formatação — `IdentificacaoNoPapel.numeroDoRdo` já é `number`.
 *
 * O tipo é declarado aqui e não importado do `rdo`: módulo não importa de
 * módulo. Quem produz a projeção escreve contra `shared`, e a ligação acontece
 * na raiz de composição, onde a tipagem estrutural confere as duas pontas.
 *
 * **Nenhum campo de nome de trabalhador e nenhum campo de autor**, como no
 * diário: o efetivo chega agregado por função e por identificador, e o que não
 * chega ao módulo não vaza para o papel.
 */

import type { DiaPuro } from '../../../shared/date/dia';
import type { Instante } from '../../../shared/date/fuso';
import { geraId, type ObraId, type UsuarioId } from '../../../shared/id';
import type { ErroDeDominio, Result } from '../../../shared/result';
import type {
  AssinaturaNoPapel,
  CaracteristicasNoPapel,
  CelulaDeEfetivo,
  InformacoesGeraisNoPapel,
  LinhaDeAtividadeNoPapel,
  LinhaDeProducaoNoPapel,
  RdoParaDocumento,
} from '../portas';

export interface IdentificacaoDoPeriodoNoPapel {
  /** Primeiro e último dia, para o nome do arquivo. Nunca impressos assim. */
  readonly primeiroDia: DiaPuro;
  readonly ultimoDia: DiaPuro;
  /**
   * A faixa `02/09/2026 a 09/09/2026`, no **mesmo campo** da data do diário e
   * sem rótulo novo (resposta A1 do dono do produto, 17/09/2026).
   */
  readonly data: string;
  /**
   * Quantos dias o conjunto tem. Sai no campo herdado `DIA`, que num conjunto
   * não teria sentido como dia da semana (resposta A2).
   */
  readonly quantidadeDeDias: number;
  /** Todos os BMS que o conjunto cobre. Vazio quando nenhum o cobre (DP7). */
  readonly bms: string;
  /**
   * **A lista** dos números de RDO, e não uma faixa (resposta de 17/09/2026 que
   * revisa DP7). É `number[]` de propósito: uma faixa não é representável neste
   * tipo, e o conjunto `{209, 212, 216}` não pode virar `209 a 216` por
   * distração de quem formata. Faixa afirmaria continuidade onde o conjunto tem
   * buraco, e o fiscal leria oito dias onde houve três.
   */
  readonly numerosDoRdo: readonly number[];
}

/**
 * O efetivo médio, sem a divisão `pagina1`/`continuacao` do diário.
 *
 * O consolidado não tem orçamento de linhas (contrato, decisão 15): ele carrega
 * tudo e o renderizador quebra a página com o cabeçalho preso ao alto. A
 * divisão do diário existe porque **um** dia cabe em uma folha, e isso é
 * promessa do gabarito diário, não do período.
 */
export interface BlocoDeEfetivoMedioNoPapel {
  readonly colunas: readonly CelulaDeEfetivo[];
  readonly total: string;
}

/** As atividades de um dia do conjunto. Grupo vazio é dia não lançado. */
export interface GrupoDeAtividadesNoPapel {
  readonly chave: string;
  /** `dd/mm/aaaa`. Separa os grupos; não é rótulo, é valor. */
  readonly data: string;
  readonly linhas: readonly LinhaDeAtividadeNoPapel[];
}

export interface GrupoDeComentariosNoPapel {
  readonly chave: string;
  readonly data: string;
  readonly linhas: readonly string[];
}

/**
 * Pluviometria do conjunto (DP4).
 *
 * Os três turnos do diário não existem aqui: no período o que existe é a
 * contagem de dias por letra, mais os dias parados, que vêm do **estado do
 * dia** e não da leitura do pluviômetro.
 *
 * As contagens imprimem `0` quando zero. A regra "zero em branco" é do
 * efetivo, não de contador de dias (contrato, 2.6).
 */
export interface PluviometriaDoPeriodoNoPapel {
  readonly diasBons: number;
  readonly diasChuvosos: number;
  readonly diasImpraticaveis: number;
  readonly diasParados: number;
  /** `123 mm`; vazio quando nenhum dia teve leitura. */
  readonly indice: string;
}

export interface RdoDePeriodoParaDocumento {
  /** `data:` URI da logo, ou `null`. Mesma marca dos diários do mesmo arquivo. */
  readonly logo: string | null;
  readonly identificacao: IdentificacaoDoPeriodoNoPapel;
  readonly informacoesGerais: InformacoesGeraisNoPapel;
  readonly caracteristicas: CaracteristicasNoPapel;
  readonly efetivoPessoal: BlocoDeEfetivoMedioNoPapel;
  readonly efetivoEquipamentos: BlocoDeEfetivoMedioNoPapel;
  readonly producao: readonly LinhaDeProducaoNoPapel[];
  /** Por data, em ordem crescente. Nada agrupado nem deduplicado (DP3). */
  readonly atividades: readonly GrupoDeAtividadesNoPapel[];
  readonly pluviometria: PluviometriaDoPeriodoNoPapel;
  readonly comentariosCros: readonly GrupoDeComentariosNoPapel[];
  /** O responsável técnico **vigente** (DP8). */
  readonly responsavelTecnico: AssinaturaNoPapel | null;
}

export type ModoDeExportacaoDePeriodo =
  'consolidado' | 'diarios' | 'consolidado-com-diarios';

export type FormatoDeExportacaoDePeriodo = 'PDF' | 'XLSX';

/**
 * O que vai para o papel, discriminado pelo modo.
 *
 * Os diários anexados são `RdoParaDocumento`, o tipo do documento já aprovado:
 * o anexo é o diário sem uma linha de diferença.
 */
export type PacoteParaDocumento =
  | { readonly modo: 'consolidado'; readonly consolidado: RdoDePeriodoParaDocumento }
  | { readonly modo: 'diarios'; readonly diarios: readonly RdoParaDocumento[] }
  | {
      readonly modo: 'consolidado-com-diarios';
      readonly consolidado: RdoDePeriodoParaDocumento;
      readonly diarios: readonly RdoParaDocumento[];
    };

/**
 * O lote que reúne as linhas de trilha de uma exportação.
 *
 * O tipo de marca sai de `geraId`, sem `as` e sem tocar em `shared/id`
 * (`padroes-codigo`, seção Tipos).
 */
export type LoteDeExportacaoId = ReturnType<typeof geraId<'lote_de_exportacao'>>;

/**
 * Uma linha da trilha (R20): quem, quando, qual obra, **qual dia**.
 *
 * Uma linha por dia do conjunto, amarradas pelo `loteId` (contrato, 4.5). O par
 * `dataInicial`/`dataFinal` mentiria sobre conjunto não contíguo: exportar
 * {02, 05, 09} viraria "02 a 09", e a auditoria leria oito dias onde houve
 * três. Id, nunca nome.
 */
export interface EventoDeExportacaoDePeriodo {
  readonly obraId: ObraId;
  readonly usuarioId: UsuarioId;
  readonly momento: Instante;
  readonly dia: DiaPuro;
  readonly formato: FormatoDeExportacaoDePeriodo;
  readonly loteId: LoteDeExportacaoId;
}

export interface PedidoDeExportacaoDePeriodo {
  readonly obraId: ObraId;
  /** O conjunto normalizado: ordenado, sem repetição, não vazio (contrato 1.1). */
  readonly dias: readonly DiaPuro[];
  readonly modo: ModoDeExportacaoDePeriodo;
  readonly formato: FormatoDeExportacaoDePeriodo;
}

export interface PortasDoExportDePeriodo {
  readonly montaPacote: (
    obraId: ObraId,
    dias: readonly DiaPuro[],
    modo: ModoDeExportacaoDePeriodo,
  ) => Promise<Result<PacoteParaDocumento, ErroDeDominio>>;
  /**
   * Grava o lote **inteiro**, de uma vez. A trilha de um período é atômica: um
   * lote pela metade afirmaria que só parte dos dias saiu.
   */
  readonly registraExportacao: (
    eventos: readonly EventoDeExportacaoDePeriodo[],
  ) => Promise<Result<void, ErroDeDominio>>;
  /** Relógio injetado: teste unitário não usa relógio real. */
  readonly agora: () => Instante;
}
