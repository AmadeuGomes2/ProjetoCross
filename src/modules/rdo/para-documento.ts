/**
 * Projeção do RDO diário para o documento.
 *
 * `docs/arquitetura/v1.md`, 4.8: o `export` recebe um `RdoParaDocumento`,
 * **sem** o resumo do dia e **sem** os avisos. O que não chega ao módulo não
 * pode vazar para o papel — a poda é aqui, e não uma disciplina de quem
 * desenha o PDF (decisões 3.3 e 12.1).
 *
 * É aqui também que a divisão de página acontece (decisão 11.1). O total do
 * efetivo continua sendo o de todas as colunas, inclusive as que foram para a
 * continuação: somar só o que coube na página 1 é o defeito silencioso mais
 * provável do transbordo (CT-265).
 *
 * O tipo de retorno é declarado aqui e o `export` declara um igual, por
 * estrutura: módulo não importa de módulo. A conferência das duas pontas
 * acontece na raiz de composição.
 */

import type { DiaPuro } from '../../shared/date/dia';
import type { ColunaDeEfetivo } from './efetivo';
import {
  ATIVIDADES_NA_PAGINA_1,
  COLUNAS_DE_EFETIVO_NA_PAGINA_1,
  LINHAS_DE_COMENTARIO_NA_PAGINA_1,
} from './limites';
import type { RdoDiario } from './tipos';
import { divideEmPaginas } from './transbordo';

export interface CelulaDeEfetivo {
  readonly chave: string;
  readonly rotulo: string;
  readonly quantidade: string;
}

export interface BlocoDeEfetivoNoPapel {
  readonly pagina1: readonly CelulaDeEfetivo[];
  readonly continuacao: readonly CelulaDeEfetivo[];
  readonly total: string;
}

export interface LinhaDeAtividadeNoPapel {
  readonly chave: string;
  readonly descricao: string;
  readonly status: string;
}

export interface RdoParaDocumento {
  /**
   * A logo da contratada, como `data:` URI pronto, ou `null`.
   *
   * Chega de fora, e não do `RdoDiario`: a logo é `bytea` na linha da obra, e
   * carregá-la em toda montagem de RDO arrastaria até meio megabyte para um
   * dado que só a exportação usa. Quem exporta pede; quem só olha na tela, não.
   */
  readonly logo: string | null;
  readonly identificacao: {
    readonly dia: DiaPuro;
    readonly data: string;
    readonly diaDaSemana: string;
    readonly bms: string;
    readonly numeroDoRdo: number;
  };
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
  readonly efetivoPessoal: BlocoDeEfetivoNoPapel;
  readonly efetivoEquipamentos: BlocoDeEfetivoNoPapel;
  readonly producao: readonly {
    readonly chave: string;
    readonly servico: string;
    readonly exec: string;
    readonly acum: string;
    readonly projeto: string;
    readonly percentual: string;
    readonly fracao: number;
  }[];
  readonly atividades: {
    readonly pagina1: readonly LinhaDeAtividadeNoPapel[];
    readonly continuacao: readonly LinhaDeAtividadeNoPapel[];
  };
  readonly pluviometria: {
    readonly noiteAnterior: string;
    readonly manha: string;
    readonly tarde: string;
    readonly indice: string;
  };
  readonly comentariosCros: {
    readonly pagina1: readonly string[];
    readonly continuacao: readonly string[];
  };
  readonly responsavelTecnico: {
    readonly nome: string;
    readonly titulo: string;
    readonly registro: string;
  } | null;
  readonly temContinuacao: boolean;
}

function celulas(colunas: readonly ColunaDeEfetivo[]): CelulaDeEfetivo[] {
  return colunas.map((c) => ({
    chave: c.chave,
    rotulo: c.rotulo,
    quantidade: c.texto,
  }));
}

function blocoNoPapel(
  colunas: readonly ColunaDeEfetivo[],
  total: number,
): BlocoDeEfetivoNoPapel {
  const divisao = divideEmPaginas(celulas(colunas), COLUNAS_DE_EFETIVO_NA_PAGINA_1);
  return {
    pagina1: divisao.pagina1,
    continuacao: divisao.continuacao,
    total: String(total),
  };
}

export function paraDocumento(
  rdo: RdoDiario,
  /**
   * `data:` URI da logo, ou `null` quando a obra não tem uma.
   *
   * **Obrigatório, sem valor padrão.** A primeira versão tinha `= null`, e o
   * padrão silencioso fez exatamente o que padrão silencioso faz: o consolidado
   * do período ficou sem logo enquanto os diários anexados **no mesmo arquivo**
   * saíam com ela, e nada acusou. Quem acrescentar um caminho de exportação
   * agora é obrigado a decidir.
   */
  logo: string | null,
): RdoParaDocumento {
  const atividades = divideEmPaginas(
    rdo.atividades.map<LinhaDeAtividadeNoPapel>((linha) =>
      linha.tipo === 'atividade'
        ? { chave: linha.lancamentoId, descricao: linha.descricao, status: linha.status }
        : // Decisão 4.1: o motivo ocupa a primeira linha do bloco e não carrega
          // status; não existe "dia parado com status Produção".
          { chave: 'motivo-de-parada', descricao: linha.motivo, status: '' },
    ),
    ATIVIDADES_NA_PAGINA_1,
  );

  const comentarios = divideEmPaginas(
    rdo.comentariosCros.linhas,
    LINHAS_DE_COMENTARIO_NA_PAGINA_1,
  );

  const efetivoPessoal = blocoNoPapel(
    rdo.efetivoPessoal.colunas,
    rdo.efetivoPessoal.total,
  );
  const efetivoEquipamentos = blocoNoPapel(
    rdo.efetivoEquipamentos.colunas,
    rdo.efetivoEquipamentos.total,
  );

  return {
    logo,
    identificacao: {
      dia: rdo.identificacao.dia,
      data: rdo.identificacao.dataBr,
      diaDaSemana: rdo.identificacao.diaDaSemana,
      bms: rdo.identificacao.bms === null ? '' : String(rdo.identificacao.bms),
      numeroDoRdo: rdo.identificacao.numeroDoRdo,
    },
    informacoesGerais: rdo.informacoesGerais,
    caracteristicas: rdo.caracteristicasDoProjeto,
    efetivoPessoal,
    efetivoEquipamentos,
    producao: rdo.producao.map((l) => ({
      chave: l.servicoId,
      servico: l.nome,
      exec: l.executadoTexto,
      acum: l.acumuladoTexto,
      projeto: l.projetoTexto,
      percentual: l.percentualTexto,
      fracao: l.fracaoDoProjeto,
    })),
    atividades: { pagina1: atividades.pagina1, continuacao: atividades.continuacao },
    pluviometria: {
      // Decisão 2.3: a LETRA do turno. Turno em branco sai vazio, nunca `-`.
      noiteAnterior: rdo.pluviometria.noiteAnterior ?? '',
      manha: rdo.pluviometria.manha ?? '',
      tarde: rdo.pluviometria.tarde ?? '',
      indice: rdo.pluviometria.indiceTexto,
    },
    comentariosCros: {
      pagina1: comentarios.pagina1,
      continuacao: comentarios.continuacao,
    },
    responsavelTecnico: rdo.responsavelTecnico,
    temContinuacao:
      atividades.continuacao.length > 0 ||
      comentarios.continuacao.length > 0 ||
      efetivoPessoal.continuacao.length > 0 ||
      efetivoEquipamentos.continuacao.length > 0,
  };
}
