/**
 * Monta o RDO diário.
 *
 * `docs/arquitetura/v1.md`, 4.7: **nada é gravado**. Este módulo não tem
 * repositório, não importa `src/db` e não conhece outro módulo: ele recebe as
 * portas e calcula. Determinismo é requisito, não detalhe — as mesmas portas
 * com os mesmos dados produzem o mesmo RDO, campo por campo, porque duas
 * versões do mesmo dia nas mãos do fiscal é o pior defeito possível (CT-241).
 *
 * Decisão 23.1: consultar um dia **fora do período da obra** não gera
 * documento. Sem isso o número do RDO sairia negativo, e RDO com número
 * negativo não existe no contrato.
 */

import { comparaDias, type DiaPuro, diaDaSemana, formataBr } from '../../shared/date/dia';
import {
  erro,
  erroDeDominio,
  type ErroDeDominio,
  ok,
  type Result,
  CODIGO_ERRO,
} from '../../shared/result';
import type { ObraId } from '../../shared/id';
import { calculaAvisos } from './avisos';
import { calculaEfetivoDeEquipamento, calculaEfetivoPessoal } from './efetivo';
import { formataIndiceMm } from './formata';
import {
  ATIVIDADES_NA_PAGINA_1,
  COLUNAS_DE_EFETIVO_NA_PAGINA_1,
  LARGURA_DA_LINHA_DE_COMENTARIO,
  LINHAS_DE_COMENTARIO_NA_PAGINA_1,
} from './limites';
import { calculaNumeroDoRdo } from './numero-do-rdo';
import type { PortasDoRdo } from './portas';
import { calculaProducaoControlada } from './producao';
import { calculaResumoDoDia } from './resumo-do-dia';
import type { EstadoDoRdo, LinhaDeAtividade, RdoDiario } from './tipos';
import { divideEmPaginas, quebraEmLinhas } from './transbordo';

export async function montaRdoDiario(
  obraId: ObraId,
  dia: DiaPuro,
  portas: PortasDoRdo,
): Promise<Result<RdoDiario, ErroDeDominio>> {
  const cabecalho = await portas.cabecalho(obraId);
  if (!cabecalho.ok) return cabecalho;
  const obra = cabecalho.valor;

  if (comparaDias(dia, obra.dataInicio) < 0 || comparaDias(dia, obra.dataTermino) > 0) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.DATA_FORA_DO_PERIODO_DA_OBRA,
        `A data ${formataBr(dia)} está fora do período do contrato, que vai de ${formataBr(obra.dataInicio)} a ${formataBr(obra.dataTermino)}.`,
      ),
    );
  }

  const bms = await portas.bms(obraId, dia);
  if (!bms.ok) return bms;
  const diaDeObra = await portas.dia(obraId, dia);
  if (!diaDeObra.ok) return diaDeObra;
  const funcoes = await portas.funcoes(obraId);
  if (!funcoes.ok) return funcoes;
  const pessoal = await portas.pessoalMobilizado(obraId);
  if (!pessoal.ok) return pessoal;
  const equipamentos = await portas.equipamentosMobilizados(obraId);
  if (!equipamentos.ok) return equipamentos;
  const servicos = await portas.servicos(obraId);
  if (!servicos.ok) return servicos;
  const lancamentos = await portas.lancamentosDeProducaoAte(obraId, dia);
  if (!lancamentos.ok) return lancamentos;
  const atividades = await portas.atividades(obraId, dia);
  if (!atividades.ok) return atividades;
  const pluviometria = await portas.pluviometria(obraId, dia);
  if (!pluviometria.ok) return pluviometria;
  const observacoes = await portas.observacoesCros(obraId, dia);
  if (!observacoes.ok) return observacoes;

  const registroDoDia = diaDeObra.valor;
  const estadoDoDia: EstadoDoRdo = registroDoDia?.estado ?? 'nao lancado';
  const eDiaParado = estadoDoDia === 'parado';

  const efetivoPessoal = calculaEfetivoPessoal(
    funcoes.valor,
    pessoal.valor,
    dia,
    eDiaParado,
  );
  const efetivoEquipamentos = calculaEfetivoDeEquipamento(
    equipamentos.valor,
    dia,
    eDiaParado,
  );

  const producao = calculaProducaoControlada(servicos.valor, lancamentos.valor, dia);

  // Decisão 4.1: em dia parado o motivo ocupa a primeira linha do bloco 8, onde
  // o fiscal já está acostumado a lê-lo, sem virar atividade e sem status. A
  // combinação "parado com atividade" é impossível por construção: a 4.3 recusa
  // a atividade e a 24.1 recusa a parada, nenhuma das duas apaga nada.
  const linhasDeAtividade: readonly LinhaDeAtividade[] =
    eDiaParado && registroDoDia?.motivoParada != null
      ? [{ tipo: 'motivo-de-parada', motivo: registroDoDia.motivoParada }]
      : atividades.valor.map((a) => ({
          tipo: 'atividade',
          lancamentoId: a.lancamentoId,
          descricao: a.descricao,
          status: a.status,
        }));

  const leitura = pluviometria.valor;
  const textos = observacoes.valor.map((o) => o.texto);
  const linhasDeComentario = textos.flatMap((t) =>
    quebraEmLinhas(t, LARGURA_DA_LINHA_DE_COMENTARIO),
  );

  const transbordoDeAtividades = divideEmPaginas(
    linhasDeAtividade,
    ATIVIDADES_NA_PAGINA_1,
  ).continuacao;
  const transbordoDeComentario = divideEmPaginas(
    linhasDeComentario,
    LINHAS_DE_COMENTARIO_NA_PAGINA_1,
  ).continuacao;
  const transbordoDePessoal = divideEmPaginas(
    efetivoPessoal.colunas,
    COLUNAS_DE_EFETIVO_NA_PAGINA_1,
  ).continuacao;
  const transbordoDeEquipamento = divideEmPaginas(
    efetivoEquipamentos.colunas,
    COLUNAS_DE_EFETIVO_NA_PAGINA_1,
  ).continuacao;

  const numero = calculaNumeroDoRdo(
    obra.dataInicio,
    dia,
    registroDoDia?.numeroRdoCongelado ?? null,
  );

  return ok({
    obraId,
    identificacao: {
      dia,
      dataBr: formataBr(dia),
      diaDaSemana: diaDaSemana(dia),
      bms: bms.valor,
      numeroDoRdo: numero.numero,
      numeroCongelado: numero.congelado,
    },
    // Decisão 17.1: o espaço do FIM do texto fixo é recortado; o do meio, como
    // o duplo de `PAVIMENTAÇÃO  - BLOCO 02`, é preservado.
    informacoesGerais: {
      contrato: obra.contrato.trim(),
      dataInicio: formataBr(obra.dataInicio),
      dataFinal: formataBr(obra.dataTermino),
      contratante: obra.contratante.trim(),
      contratada: obra.contratada.trim(),
      escopo: obra.escopo.trim(),
    },
    caracteristicasDoProjeto: {
      nome: obra.nomeProjeto.trim(),
      area: obra.area.trim(),
      local: obra.local.trim(),
    },
    responsavelTecnico: obra.responsavelTecnico,
    estadoDoDia,
    motivoDaParada: registroDoDia?.motivoParada ?? null,
    efetivoPessoal,
    efetivoEquipamentos,
    producao,
    atividades: linhasDeAtividade,
    pluviometria: {
      noiteAnterior: leitura?.noiteAnterior ?? null,
      manha: leitura?.manha ?? null,
      tarde: leitura?.tarde ?? null,
      indiceTexto: formataIndiceMm(leitura?.indiceMm ?? null),
      temLancamento: leitura !== null,
    },
    comentariosCros: { textos, linhas: linhasDeComentario },
    // Decisão 10.1: o bloco aparece com o rótulo e sem conteúdo na v1.
    comentarioContratante: [],
    resumoDoDia: calculaResumoDoDia(leitura),
    avisos: calculaAvisos({
      bms: bms.valor,
      producao,
      atividades: linhasDeAtividade,
      responsavelTecnico: obra.responsavelTecnico,
    }),
    transbordo: {
      atividades: transbordoDeAtividades,
      linhasDeComentario: transbordoDeComentario,
      colunasDePessoal: transbordoDePessoal,
      colunasDeEquipamento: transbordoDeEquipamento,
      temTransbordo:
        transbordoDeAtividades.length > 0 ||
        transbordoDeComentario.length > 0 ||
        transbordoDePessoal.length > 0 ||
        transbordoDeEquipamento.length > 0,
    },
  });
}
