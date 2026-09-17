/**
 * Um RDO diário em linhas de planilha, para as abas anexadas.
 *
 * Mesmos blocos e mesma ordem do PDF do diário, com os rótulos herdados — os
 * três turnos e o `INDICE` inclusive, que no diário existem e no consolidado
 * não.
 *
 * O que transbordou para a página de continuação volta para junto do seu bloco:
 * `pagina1` e `continuacao` são divisão **de papel**, e a planilha não tem
 * folha. Concatenar não é truncar, e nada se perde.
 */

import { ROTULO } from '../../documento/rotulos';
import type { RdoParaDocumento } from '../../portas';
import { LINHA_VAZIA, type LinhaDaPlanilha } from './linha';

export function linhasDoDiario(rdo: RdoParaDocumento): readonly LinhaDaPlanilha[] {
  const identificacao = rdo.identificacao;
  const gerais = rdo.informacoesGerais;
  const caracteristicas = rdo.caracteristicas;
  const pluviometria = rdo.pluviometria;
  const responsavel = rdo.responsavelTecnico;

  const pessoal = [...rdo.efetivoPessoal.pagina1, ...rdo.efetivoPessoal.continuacao];
  const equipamentos = [
    ...rdo.efetivoEquipamentos.pagina1,
    ...rdo.efetivoEquipamentos.continuacao,
  ];
  const atividades = [...rdo.atividades.pagina1, ...rdo.atividades.continuacao];
  const comentarios = [
    ...rdo.comentariosCros.pagina1,
    ...rdo.comentariosCros.continuacao,
  ];

  return [
    [ROTULO.TITULO],
    [
      identificacao.data,
      identificacao.diaDaSemana,
      ROTULO.BMS,
      identificacao.bms,
      ROTULO.NUMERO_DO_RDO,
      identificacao.numeroDoRdo,
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

    [ROTULO.EFETIVO_PESSOAL],
    [...pessoal.map((coluna) => coluna.rotulo), ROTULO.TOTAL],
    [...pessoal.map((coluna) => coluna.quantidade), rdo.efetivoPessoal.total],
    LINHA_VAZIA,

    [ROTULO.EFETIVO_EQUIPAMENTOS],
    [...equipamentos.map((coluna) => coluna.rotulo), ROTULO.TOTAL],
    [...equipamentos.map((coluna) => coluna.quantidade), rdo.efetivoEquipamentos.total],
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
    ...atividades.map((linha) => [linha.descricao, linha.status]),
    LINHA_VAZIA,

    [ROTULO.PLUVIOMETRIA],
    // A letra do turno, nunca a palavra por extenso (decisão 2.3).
    [ROTULO.NOITE_ANTERIOR, pluviometria.noiteAnterior],
    [ROTULO.MANHA, pluviometria.manha],
    [ROTULO.TARDE, pluviometria.tarde],
    [ROTULO.INDICE, pluviometria.indice],
    LINHA_VAZIA,

    [ROTULO.COMENTARIOS_CROS, ROTULO.COMENTARIO_CONTRATANTE],
    ...comentarios.map((texto) => [texto]),
    LINHA_VAZIA,

    [ROTULO.REPRESENTANTE_CROS, ROTULO.REPRESENTANTE_CONTRATANTE],
    ...(responsavel === null
      ? []
      : [[responsavel.nome], [responsavel.titulo], [responsavel.registro]]),
  ];
}
