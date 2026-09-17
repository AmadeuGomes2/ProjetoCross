/**
 * O consolidado em linhas de planilha — **espelho** do PDF.
 *
 * `docs/arquitetura/periodo.md`, 4.3: o Excel consome o mesmo pacote que o PDF
 * e não recalcula nada. Os mesmos blocos, na mesma ordem, com os mesmos
 * rótulos: se o fiscal comparar a planilha com o documento, tem que ver a mesma
 * coisa, e não dois números para o mesmo serviço.
 *
 * Os dois textos derivados — a lista de `RDO Nº` e a contagem `N dias` — vêm das
 * mesmas funções que o documento usa. Reescrevê-los aqui seria a maneira mais
 * curta de fazer PDF e planilha divergirem num acento de vírgula.
 */

import { ROTULO, ROTULO_DE_PERIODO } from '../../documento/rotulos';
import {
  textoDaQuantidadeDeDias,
  textoDosNumerosDoRdo,
} from '../documento/documento-de-periodo';
import type { RdoDePeriodoParaDocumento } from '../portas';
import { LINHA_VAZIA, type LinhaDaPlanilha } from './linha';

export function linhasDoConsolidado(
  rdo: RdoDePeriodoParaDocumento,
): readonly LinhaDaPlanilha[] {
  const identificacao = rdo.identificacao;
  const gerais = rdo.informacoesGerais;
  const caracteristicas = rdo.caracteristicas;
  const pluviometria = rdo.pluviometria;
  const responsavel = rdo.responsavelTecnico;

  return [
    [ROTULO.TITULO],
    [
      identificacao.data,
      textoDaQuantidadeDeDias(identificacao.quantidadeDeDias),
      ROTULO.BMS,
      identificacao.bms,
      ROTULO.NUMERO_DO_RDO,
      textoDosNumerosDoRdo(identificacao.numerosDoRdo),
    ],
    LINHA_VAZIA,

    [ROTULO.INFORMACOES_GERAIS],
    [ROTULO.CONTRATO, gerais.contrato],
    [ROTULO.DATA_INICIO, gerais.dataInicio],
    [ROTULO.DATA_FINAL, gerais.dataFinal],
    [ROTULO.CONTRATANTE, gerais.contratante],
    [ROTULO.CONTRATADA, gerais.contratada],
    [ROTULO.ESCOPO, gerais.escopo],
    LINHA_VAZIA,

    [ROTULO.CARACTERISTICAS],
    [ROTULO.NOME, caracteristicas.nome],
    [ROTULO.AREA, caracteristicas.area],
    [ROTULO.LOCAL, caracteristicas.local],
    LINHA_VAZIA,

    [ROTULO_DE_PERIODO.EFETIVO_PESSOAL_MEDIA],
    [...rdo.efetivoPessoal.colunas.map((coluna) => coluna.rotulo), ROTULO.TOTAL],
    [
      ...rdo.efetivoPessoal.colunas.map((coluna) => coluna.quantidade),
      rdo.efetivoPessoal.total,
    ],
    LINHA_VAZIA,

    [ROTULO_DE_PERIODO.EFETIVO_EQUIPAMENTOS_MEDIA],
    [...rdo.efetivoEquipamentos.colunas.map((coluna) => coluna.rotulo), ROTULO.TOTAL],
    [
      ...rdo.efetivoEquipamentos.colunas.map((coluna) => coluna.quantidade),
      rdo.efetivoEquipamentos.total,
    ],
    LINHA_VAZIA,

    [ROTULO.PRODUCAO_CONTROLADA],
    [ROTULO.SERVICO, ROTULO.EXEC, ROTULO.ACUM, ROTULO.PROJETO],
    ...rdo.producao.map((linha) => [
      linha.servico,
      linha.exec,
      linha.acum,
      linha.projeto,
      linha.percentual,
    ]),
    LINHA_VAZIA,

    [ROTULO.ATIVIDADES, ROTULO.STATUS],
    // Por data, e nada deduplicado (DP3). O dia sem linha nenhuma continua
    // aparecendo com a sua data: sumir seria corte silencioso.
    ...rdo.atividades.flatMap((grupo) => [
      [grupo.data],
      ...grupo.linhas.map((linha) => [linha.descricao, linha.status]),
    ]),
    LINHA_VAZIA,

    [ROTULO.PLUVIOMETRIA],
    // Contagem de dias é número: quem abre a planilha para somar não deveria
    // ter que reconverter texto. Zero imprime zero (contrato, 2.6).
    [ROTULO_DE_PERIODO.DIAS_BONS, pluviometria.diasBons],
    [ROTULO_DE_PERIODO.DIAS_CHUVOSOS, pluviometria.diasChuvosos],
    [ROTULO_DE_PERIODO.DIAS_IMPRATICAVEIS, pluviometria.diasImpraticaveis],
    [ROTULO_DE_PERIODO.DIAS_PARADOS, pluviometria.diasParados],
    // O índice já vem com a unidade do domínio; separar o número do `mm` aqui
    // seria formatar no `export`, que é o que o contrato proíbe.
    [ROTULO.INDICE, pluviometria.indice],
    LINHA_VAZIA,

    // Decisão 10.1: a coluna do contratante aparece e sai sempre vazia na v1.
    [ROTULO.COMENTARIOS_CROS, ROTULO.COMENTARIO_CONTRATANTE],
    ...rdo.comentariosCros.flatMap((grupo) => [
      [grupo.data],
      ...grupo.linhas.map((texto) => [texto]),
    ]),
    LINHA_VAZIA,

    [ROTULO.REPRESENTANTE_CROS, ROTULO.REPRESENTANTE_CONTRATANTE],
    ...(responsavel === null
      ? []
      : [[responsavel.nome], [responsavel.titulo], [responsavel.registro]]),
  ];
}
