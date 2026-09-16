/**
 * O RDO diário montado.
 *
 * `CLAUDE.md`, Modelo: "RDO é sempre calculado, nunca armazenado pronto." Este
 * tipo é o resultado de uma consulta sobre lançamentos, e não existe tabela
 * correspondente a ele.
 *
 * Duas propriedades do tipo, verificáveis por inspeção:
 *
 * - **não há campo de nome de trabalhador nem de autor de lançamento.** O que
 *   não existe aqui não pode vazar para a tela, para o PDF nem para o JSON;
 * - `resumoDoDia` e `avisos` são **de tela**. A projeção para o documento
 *   (`para-documento.ts`) os poda, porque o gabarito impresso não os tem
 *   (decisões 3.3 e 12.1).
 */

import type { DiaPuro, NomeDoDia } from '../../shared/date/dia';
import type { LancamentoId, ObraId, ServicoControladoId } from '../../shared/id';
import type { EstadoDoDia, LetraDeTurno, ResumoDoDia } from '../../shared/taxonomia';
import type { BlocoDeEfetivo, ColunaDeEfetivo } from './efetivo';
import type { ResponsavelTecnico } from './portas';
import type { LinhaDeProducao } from './producao';

/** Decisão 4.2: são três estados, e `não lançado` é ausência de registro. */
export type EstadoDoRdo = EstadoDoDia | 'nao lancado';

export interface IdentificacaoDoRdo {
  readonly dia: DiaPuro;
  /** Sempre `dd/mm/aaaa`. A planilha usa formato americano em metade das abas. */
  readonly dataBr: string;
  readonly diaDaSemana: NomeDoDia;
  /** `null` quando nenhum período de BMS cobre a data (decisão 21.1). */
  readonly bms: number | null;
  readonly numeroDoRdo: number;
  readonly numeroCongelado: boolean;
}

export interface InformacoesGerais {
  readonly contrato: string;
  readonly dataInicio: string;
  readonly dataFinal: string;
  readonly contratante: string;
  readonly contratada: string;
  readonly escopo: string;
}

export interface CaracteristicasDoProjeto {
  readonly nome: string;
  readonly area: string;
  readonly local: string;
}

/**
 * Uma linha do bloco 8.
 *
 * O dia parado não tem atividade: ele tem um motivo, que sai na primeira linha
 * do bloco (decisão 4.1). São coisas diferentes, e por isso são variantes
 * diferentes do tipo — a linha de motivo não tem status, e não há como lhe dar
 * um por engano. É o contrário das 79 linhas reais de dia parado que a planilha
 * classificou como `Produção`.
 */
export type LinhaDeAtividade =
  | {
      readonly tipo: 'atividade';
      readonly lancamentoId: LancamentoId;
      readonly descricao: string;
      readonly status: string;
    }
  | { readonly tipo: 'motivo-de-parada'; readonly motivo: string };

export interface PluviometriaDoRdo {
  readonly noiteAnterior: LetraDeTurno | null;
  readonly manha: LetraDeTurno | null;
  readonly tarde: LetraDeTurno | null;
  /** `8 mm`; vazio quando não houve lançamento. */
  readonly indiceTexto: string;
  readonly temLancamento: boolean;
}

export interface ComentariosDoRdo {
  /** Como foram escritos, para a tela, que não tem limite de página. */
  readonly textos: readonly string[];
  /** Quebrados na largura do bloco, para o papel. */
  readonly linhas: readonly string[];
}

export const AVISO_DO_RDO = {
  BMS_SEM_PERIODO: 'BMS_SEM_PERIODO',
  ACUMULADO_ACIMA_DO_PROJETO: 'ACUMULADO_ACIMA_DO_PROJETO',
  PRODUCAO_SEM_ATIVIDADE: 'PRODUCAO_SEM_ATIVIDADE',
  SEM_RESPONSAVEL_TECNICO: 'SEM_RESPONSAVEL_TECNICO',
} as const;

export type CodigoDeAviso = (typeof AVISO_DO_RDO)[keyof typeof AVISO_DO_RDO];

/** Aviso é de tela: nunca bloqueia a montagem nem entra no PDF. */
export interface AvisoDoRdo {
  readonly codigo: CodigoDeAviso;
  readonly mensagem: string;
  readonly servicoId: ServicoControladoId | null;
}

export interface TransbordoDoRdo {
  readonly atividades: readonly LinhaDeAtividade[];
  readonly linhasDeComentario: readonly string[];
  readonly colunasDePessoal: readonly ColunaDeEfetivo[];
  readonly colunasDeEquipamento: readonly ColunaDeEfetivo[];
  readonly temTransbordo: boolean;
}

export interface RdoDiario {
  readonly obraId: ObraId;
  readonly identificacao: IdentificacaoDoRdo;
  readonly informacoesGerais: InformacoesGerais;
  readonly caracteristicasDoProjeto: CaracteristicasDoProjeto;
  readonly responsavelTecnico: ResponsavelTecnico | null;
  readonly estadoDoDia: EstadoDoRdo;
  readonly motivoDaParada: string | null;
  readonly efetivoPessoal: BlocoDeEfetivo;
  readonly efetivoEquipamentos: BlocoDeEfetivo;
  readonly producao: readonly LinhaDeProducao[];
  readonly atividades: readonly LinhaDeAtividade[];
  readonly pluviometria: PluviometriaDoRdo;
  readonly comentariosCros: ComentariosDoRdo;
  /** Decisão 10.1: aparece com o rótulo e sempre vazio na v1. */
  readonly comentarioContratante: readonly string[];
  /** Decisão 3.3: só tela. Podado na projeção para o documento. */
  readonly resumoDoDia: ResumoDoDia | null;
  /** Decisão 12.1: só tela. */
  readonly avisos: readonly AvisoDoRdo[];
  readonly transbordo: TransbordoDoRdo;
}
