/**
 * As portas do módulo `export` e a projeção que ele recebe.
 *
 * `docs/arquitetura/v1.md`, 4.8: o `export` recebe um **`RdoParaDocumento`**,
 * projeção de `RdoDiario` **sem** o resumo do dia e **sem** os avisos — o que
 * não chega ao módulo não pode vazar para o papel (decisões 3.3 e 12.1).
 *
 * O tipo é declarado aqui, e não importado do `rdo`: módulo não importa de
 * módulo. Quem produz a projeção (`rdo/para-documento.ts`) escreve contra
 * `shared`, e a ligação acontece em `src/app/_composicao/`, onde a tipagem
 * estrutural confere as duas pontas.
 *
 * Tudo aqui é **texto pronto para imprimir**. É deliberado: a regra de como um
 * número vira texto — traço para produção zero, branco para efetivo zero,
 * separador brasileiro, `mm` no índice — mora num lugar só, e assim a tela e o
 * PDF não podem divergir (cenário "mesmo conteúdo do RDO na tela", R18).
 */

import type { DiaPuro } from '../../shared/date/dia';
import type { Instante } from '../../shared/date/fuso';
import type { ObraId, UsuarioId } from '../../shared/id';
import type { ErroDeDominio, Result } from '../../shared/result';

export interface IdentificacaoNoPapel {
  /** Dia puro, para o nome do arquivo. Nunca é impresso assim. */
  readonly dia: DiaPuro;
  /** `dd/mm/aaaa`. Nunca `mm/dd`. */
  readonly data: string;
  readonly diaDaSemana: string;
  /** Vazio quando nenhum período de BMS cobre a data (decisão 21.1). */
  readonly bms: string;
  readonly numeroDoRdo: number;
}

export interface InformacoesGeraisNoPapel {
  readonly contrato: string;
  readonly dataInicio: string;
  readonly dataFinal: string;
  readonly contratante: string;
  readonly contratada: string;
  readonly escopo: string;
}

export interface CaracteristicasNoPapel {
  readonly nome: string;
  readonly area: string;
  readonly local: string;
}

export interface CelulaDeEfetivo {
  readonly chave: string;
  readonly rotulo: string;
  /** Vazio quando é zero: o gabarito mostra célula em branco, não `0`. */
  readonly quantidade: string;
}

export interface BlocoDeEfetivoNoPapel {
  readonly pagina1: readonly CelulaDeEfetivo[];
  readonly continuacao: readonly CelulaDeEfetivo[];
  /** Soma de TODAS as colunas, inclusive as que transbordaram (CT-265). */
  readonly total: string;
}

export interface LinhaDeProducaoNoPapel {
  readonly chave: string;
  readonly servico: string;
  readonly exec: string;
  readonly acum: string;
  readonly projeto: string;
  readonly percentual: string;
  /** Fração do projeto, para a barra de progresso. 1 é 100%. */
  readonly fracao: number;
}

export interface LinhaDeAtividadeNoPapel {
  readonly chave: string;
  readonly descricao: string;
  /** Vazio na linha de motivo de dia parado: motivo não tem status (4.1). */
  readonly status: string;
}

export interface PluviometriaNoPapel {
  /** A LETRA do turno, `B`/`C`/`I`, nunca a palavra por extenso (decisão 2.3). */
  readonly noiteAnterior: string;
  readonly manha: string;
  readonly tarde: string;
  /** `8 mm`; vazio quando não houve lançamento. */
  readonly indice: string;
}

export interface AssinaturaNoPapel {
  readonly nome: string;
  readonly titulo: string;
  readonly registro: string;
}

export interface RdoParaDocumento {
  readonly identificacao: IdentificacaoNoPapel;
  readonly informacoesGerais: InformacoesGeraisNoPapel;
  readonly caracteristicas: CaracteristicasNoPapel;
  readonly efetivoPessoal: BlocoDeEfetivoNoPapel;
  readonly efetivoEquipamentos: BlocoDeEfetivoNoPapel;
  readonly producao: readonly LinhaDeProducaoNoPapel[];
  readonly atividades: {
    readonly pagina1: readonly LinhaDeAtividadeNoPapel[];
    readonly continuacao: readonly LinhaDeAtividadeNoPapel[];
  };
  readonly pluviometria: PluviometriaNoPapel;
  readonly comentariosCros: {
    readonly pagina1: readonly string[];
    readonly continuacao: readonly string[];
  };
  /** Decisão 10.1: o bloco aparece com o rótulo e sempre vazio na v1. */
  readonly responsavelTecnico: AssinaturaNoPapel | null;
  readonly temContinuacao: boolean;
}

export interface AtorDaExportacao {
  readonly usuarioId: UsuarioId;
  readonly perfil: 'engenheiro' | 'encarregado';
}

/** A trilha de R20: quem, quando, qual obra, qual período. Id, nunca nome. */
export interface EventoDeExportacao {
  readonly obraId: ObraId;
  readonly usuarioId: UsuarioId;
  readonly momento: Instante;
  readonly dataRdo: DiaPuro;
  readonly formato: 'PDF';
}

export interface PortasDoExport {
  readonly montaRdo: (
    obraId: ObraId,
    dia: DiaPuro,
  ) => Promise<Result<RdoParaDocumento, ErroDeDominio>>;
  readonly registraExportacao: (
    evento: EventoDeExportacao,
  ) => Promise<Result<void, ErroDeDominio>>;
  /** Relógio injetado: teste unitário não usa relógio real. */
  readonly agora: () => Instante;
}
