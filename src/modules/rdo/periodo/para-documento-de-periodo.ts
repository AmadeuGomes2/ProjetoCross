/**
 * Projeção do RDO de período para o documento.
 *
 * O par do `para-documento.ts` do diário, e pelo mesmo motivo: **o que não
 * chega ao módulo `export` não pode vazar para o papel.** A poda é aqui, não
 * uma disciplina de quem desenha o PDF.
 *
 * O que fica de fora, de propósito:
 *
 * - **os avisos** (`CONJUNTO_NAO_CONTIGUO`, `DIAS_NAO_LANCADOS`…), que são de
 *   tela. O papel não diz "atenção, você escolheu dias soltos" — o papel diz
 *   quais dias foram escolhidos, e a lista de `RDO Nº` já faz isso;
 * - `eContiguo` e os números inicial e final, que existem para ordenar e
 *   comparar períodos na aplicação. **A faixa não atravessa esta função**, e é o
 *   ponto inteiro dela: o documento recebe `numerosDoRdo` como lista de
 *   números, num tipo em que uma faixa não é representável.
 *
 * O tipo de retorno é declarado aqui e o `export` declara um igual, por
 * estrutura: módulo não importa de módulo. A conferência das duas pontas
 * acontece na raiz de composição.
 */

import type { DiaPuro } from '../../../shared/date/dia';
import type { RdoDePeriodo } from './tipos';

export interface CelulaDeEfetivoNoPapel {
  readonly chave: string;
  readonly rotulo: string;
  readonly quantidade: string;
}

export interface BlocoDeEfetivoMedioNoPapel {
  readonly colunas: readonly CelulaDeEfetivoNoPapel[];
  readonly total: string;
}

export interface LinhaDeAtividadeNoPapel {
  readonly chave: string;
  readonly descricao: string;
  readonly status: string;
}

export interface GrupoDeAtividadesNoPapel {
  readonly chave: string;
  readonly data: string;
  readonly linhas: readonly LinhaDeAtividadeNoPapel[];
}

export interface GrupoDeComentariosNoPapel {
  readonly chave: string;
  readonly data: string;
  readonly linhas: readonly string[];
}

export interface IdentificacaoDoPeriodoNoPapel {
  readonly primeiroDia: DiaPuro;
  readonly ultimoDia: DiaPuro;
  readonly data: string;
  readonly quantidadeDeDias: number;
  readonly bms: string;
  readonly numerosDoRdo: readonly number[];
}

export interface PluviometriaDoPeriodoNoPapel {
  readonly diasBons: number;
  readonly diasChuvosos: number;
  readonly diasImpraticaveis: number;
  readonly diasParados: number;
  readonly indice: string;
}

export interface RdoDePeriodoParaDocumento {
  readonly identificacao: IdentificacaoDoPeriodoNoPapel;
  readonly informacoesGerais: {
    readonly contrato: string;
    readonly dataInicio: string;
    readonly dataFinal: string;
    readonly contratante: string;
    readonly contratada: string;
    readonly escopo: string;
  };
  readonly caracteristicas: {
    readonly nome: string;
    readonly area: string;
    readonly local: string;
  };
  readonly efetivoPessoal: BlocoDeEfetivoMedioNoPapel;
  readonly efetivoEquipamentos: BlocoDeEfetivoMedioNoPapel;
  readonly producao: readonly {
    readonly chave: string;
    readonly servico: string;
    readonly exec: string;
    readonly acum: string;
    readonly projeto: string;
    readonly percentual: string;
    readonly fracao: number;
  }[];
  readonly atividades: readonly GrupoDeAtividadesNoPapel[];
  readonly pluviometria: PluviometriaDoPeriodoNoPapel;
  readonly comentariosCros: readonly GrupoDeComentariosNoPapel[];
  readonly responsavelTecnico: {
    readonly nome: string;
    readonly titulo: string;
    /** `registro`, como o gabarito nomeia. `crea` é o conteúdo, não o campo. */
    readonly registro: string;
  } | null;
}

function paraEfetivo(bloco: RdoDePeriodo['efetivoPessoal']): BlocoDeEfetivoMedioNoPapel {
  return {
    colunas: bloco.colunas.map((coluna) => ({
      chave: coluna.chave,
      rotulo: coluna.rotulo,
      quantidade: coluna.mediaTexto,
    })),
    total: bloco.mediaTotalTexto,
  };
}

export function paraDocumentoDePeriodo(rdo: RdoDePeriodo): RdoDePeriodoParaDocumento {
  return {
    identificacao: {
      primeiroDia: rdo.identificacao.primeiroDia,
      ultimoDia: rdo.identificacao.ultimoDia,
      data: rdo.identificacao.periodoTexto,
      quantidadeDeDias: rdo.identificacao.quantidadeDeDias,
      bms: rdo.identificacao.bmsTexto,
      // A lista, nunca a faixa (17/09/2026). `eContiguo`, `numeroDoRdoInicial`
      // e `numeroDoRdoFinal` ficam para trás: são da aplicação, não do papel.
      numerosDoRdo: rdo.identificacao.numerosDoRdo,
    },
    informacoesGerais: rdo.informacoesGerais,
    caracteristicas: {
      nome: rdo.caracteristicasDoProjeto.nome,
      area: rdo.caracteristicasDoProjeto.area,
      local: rdo.caracteristicasDoProjeto.local,
    },
    efetivoPessoal: paraEfetivo(rdo.efetivoPessoal),
    efetivoEquipamentos: paraEfetivo(rdo.efetivoEquipamentos),
    producao: rdo.producao.map((linha) => ({
      chave: linha.servicoId,
      servico: linha.nome,
      exec: linha.executadoTexto,
      acum: linha.acumuladoTexto,
      projeto: linha.projetoTexto,
      percentual: linha.percentualTexto,
      fracao: linha.fracaoDoProjeto,
    })),
    /*
     * O grupo do dia não lançado vem VAZIO e não some da lista. Sumir seria
     * corte silencioso: quem lê o papel precisa ver que 05/09 não foi lançado,
     * em vez de deduzir do buraco na sequência de datas.
     */
    atividades: rdo.atividades.map((grupo) => ({
      chave: grupo.dia,
      data: grupo.dataBr,
      linhas: grupo.linhas.map((linha) =>
        linha.tipo === 'atividade'
          ? {
              chave: linha.lancamentoId,
              descricao: linha.descricao,
              status: linha.status,
            }
          : // Decisão 4.1: o motivo da parada não carrega status. Não existe
            // "dia parado com status Produção", que é o defeito da planilha.
            { chave: `motivo-${grupo.dia}`, descricao: linha.motivo, status: '' },
      ),
    })),
    pluviometria: {
      diasBons: rdo.pluviometria.diasB,
      diasChuvosos: rdo.pluviometria.diasC,
      diasImpraticaveis: rdo.pluviometria.diasI,
      diasParados: rdo.pluviometria.diasParados,
      indice: rdo.pluviometria.totalMmTexto,
    },
    comentariosCros: rdo.comentariosCros.map((grupo) => ({
      chave: grupo.dia,
      data: grupo.dataBr,
      linhas: grupo.linhas,
    })),
    responsavelTecnico: rdo.responsavelTecnico,
  };
}
