/**
 * Monta o RDO de período — o consolidado de um conjunto de dias.
 *
 * Como o diário, **nada é gravado**: não há repositório, não se importa
 * `src/db` e não se conhece outro módulo. R5 continua inteiro — não existe
 * tabela de RDO de período, cache de média nem coluna de total de mm.
 *
 * O conjunto chega **ordenado, sem repetição e não vazio**, garantido pela
 * borda (`../borda/esquemas-de-periodo.ts`). As duas conferências que sobram
 * aqui são de domínio, e não de forma: conjunto vazio e dia fora do contrato.
 *
 * Decisão 23.1 aplicada ao conjunto (`docs/arquitetura/periodo.md`, 1.4): um só
 * dia fora do contrato **recusa o pedido inteiro**. Filtrar produziria um
 * consolidado com faixa de RDO e total de mm calculados sobre menos dias do que
 * a pessoa escolheu, e ela não saberia.
 *
 * As portas são chamadas **uma vez cada**, com o conjunto: é o que garante um
 * instantâneo só. Trinta dias pela porta do diário seriam ~360 consultas, e uma
 * retificação concorrente no meio delas faria o dia 02 vir de antes e o dia 09
 * de depois, no mesmo documento.
 */

import {
  comparaDias,
  type DiaPuro,
  diferencaEmDias,
  formataBr,
} from '../../../shared/date/dia';
import type { ObraId } from '../../../shared/id';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  type ErroDeDominio,
  ok,
  type Result,
} from '../../../shared/result';
import { calculaEfetivoDeEquipamento, calculaEfetivoPessoal } from '../efetivo';
import { LARGURA_DA_LINHA_DE_COMENTARIO } from '../limites';
import { calculaNumeroDoRdo } from '../numero-do-rdo';
import type { AtividadeDoDia, DiaDeObra, PluviometriaDoDia } from '../portas';
import type { EstadoDoRdo, LinhaDeAtividade } from '../tipos';
import { quebraEmLinhas } from '../transbordo';
import { calculaAvisosDoPeriodo } from './avisos-de-periodo';
import { resolveBmsDosDias } from './bms';
import { calculaEfetivoMedio, type EfetivoDeUmDia } from './efetivo-medio';
import { calculaPluviometriaDoPeriodo } from './pluviometria-de-periodo';
import type { PortasDoRdoDePeriodo } from './portas';
import { calculaProducaoDoPeriodo } from './producao-de-periodo';
import type {
  GrupoDeAtividadesDoDia,
  GrupoDeObservacoesDoDia,
  RdoDePeriodo,
} from './tipos';

/** Quantas datas a mensagem de recusa nomeia antes de dizer "e outros". */
const DATAS_NOMEADAS_NA_RECUSA = 3;

export async function montaRdoDePeriodo(
  obraId: ObraId,
  dias: readonly DiaPuro[],
  portas: PortasDoRdoDePeriodo,
): Promise<Result<RdoDePeriodo, ErroDeDominio>> {
  const primeiroDia = dias[0];
  const ultimoDia = dias[dias.length - 1];
  if (primeiroDia === undefined || ultimoDia === undefined) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.CAMPO_OBRIGATORIO,
        'Escolha ao menos um dia para montar o relatório do período.',
      ),
    );
  }

  const cabecalho = await portas.cabecalho(obraId);
  if (!cabecalho.ok) return cabecalho;
  const obra = cabecalho.valor;

  const foraDoContrato = dias.filter(
    (dia) =>
      comparaDias(dia, obra.dataInicio) < 0 || comparaDias(dia, obra.dataTermino) > 0,
  );
  if (foraDoContrato.length > 0) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.DATA_FORA_DO_PERIODO_DA_OBRA,
        mensagemDeDiasForaDoContrato(foraDoContrato, obra.dataInicio, obra.dataTermino),
      ),
    );
  }

  const periodosBms = await portas.periodosBms(obraId);
  if (!periodosBms.ok) return periodosBms;
  const registros = await portas.diasDeObra(obraId, dias);
  if (!registros.ok) return registros;
  const funcoes = await portas.funcoes(obraId);
  if (!funcoes.ok) return funcoes;
  const pessoal = await portas.pessoalMobilizado(obraId);
  if (!pessoal.ok) return pessoal;
  const equipamentos = await portas.equipamentosMobilizados(obraId);
  if (!equipamentos.ok) return equipamentos;
  const servicos = await portas.servicos(obraId);
  if (!servicos.ok) return servicos;
  // O ACUM. de DP6 é a leitura do diário no ÚLTIMO dia do conjunto, e uma só.
  const lancamentos = await portas.lancamentosDeProducaoAte(obraId, ultimoDia);
  if (!lancamentos.ok) return lancamentos;
  const atividades = await portas.atividadesDosDias(obraId, dias);
  if (!atividades.ok) return atividades;
  const pluviometria = await portas.pluviometriaDosDias(obraId, dias);
  if (!pluviometria.ok) return pluviometria;
  const observacoes = await portas.observacoesCrosDosDias(obraId, dias);
  if (!observacoes.ok) return observacoes;

  const registroPorDia = new Map<string, DiaDeObra>(
    registros.valor.map((r) => [r.dia, r]),
  );
  const atividadesPorDia = agrupaPorData(atividades.valor);
  const observacoesPorDia = agrupaPorData(observacoes.valor);
  const leituraPorDia = new Map<string, PluviometriaDoDia>(
    pluviometria.valor.map((p) => [p.data, p]),
  );

  // Uma resolução por dia, feita uma vez. Tudo que vem depois lê daqui, e não
  // de uma consulta de mapa com valor de reserva: um `?? 0` num número de RDO
  // seria um documento com o número errado, silenciosamente.
  const porDia = dias.map((dia) => {
    const registro = registroPorDia.get(dia) ?? null;
    const estado: EstadoDoRdo = registro?.estado ?? 'nao lancado';
    return {
      dia,
      registro,
      estado,
      eDiaParado: estado === 'parado',
      // DP2: o divisor é o dia COM registro. Dia parado tem registro e entra.
      entraNaMedia: registro !== null,
      numeroDoRdo: calculaNumeroDoRdo(
        obra.dataInicio,
        dia,
        registro?.numeroRdoCongelado ?? null,
      ).numero,
      leitura: leituraPorDia.get(dia) ?? null,
      atividades: atividadesPorDia.get(dia) ?? [],
      observacoes: observacoesPorDia.get(dia) ?? [],
    };
  });

  const efetivoPessoalPorDia: readonly EfetivoDeUmDia[] = porDia.map((d) => ({
    bloco: calculaEfetivoPessoal(funcoes.valor, pessoal.valor, d.dia, d.eDiaParado),
    entraNaMedia: d.entraNaMedia,
  }));
  const efetivoDeEquipamentoPorDia: readonly EfetivoDeUmDia[] = porDia.map((d) => ({
    bloco: calculaEfetivoDeEquipamento(equipamentos.valor, d.dia, d.eDiaParado),
    entraNaMedia: d.entraNaMedia,
  }));

  const producao = calculaProducaoDoPeriodo(
    servicos.valor,
    lancamentos.valor,
    dias,
    ultimoDia,
  );

  const gruposDeAtividade: readonly GrupoDeAtividadesDoDia[] = porDia.map((d) => ({
    dia: d.dia,
    dataBr: formataBr(d.dia),
    numeroDoRdo: d.numeroDoRdo,
    estado: d.estado,
    linhas: linhasDoDia(d.estado, d.registro, d.atividades),
  }));

  // Só os dias que têm comentário viram grupo. O dia não lançado aparece no
  // bloco 8, que é onde o leitor confere a sequência; repetir trinta blocos de
  // comentário vazios não acrescenta fato nenhum. `periodo.md` 2.7 não decide
  // isto, e a escolha fica registrada aqui, num lugar só.
  const comentariosCros: readonly GrupoDeObservacoesDoDia[] = porDia
    .filter((d) => d.observacoes.length > 0)
    .map((d) => {
      const textos = d.observacoes.map((o) => o.texto);
      return {
        dia: d.dia,
        dataBr: formataBr(d.dia),
        textos,
        linhas: textos.flatMap((t) => quebraEmLinhas(t, LARGURA_DA_LINHA_DE_COMENTARIO)),
      };
    });

  const numeros = porDia.map((d) => d.numeroDoRdo);
  const bms = resolveBmsDosDias(periodosBms.valor, dias);
  const diasLancados = porDia.filter((d) => d.entraNaMedia).length;
  const eContiguo = dias.length === diferencaEmDias(primeiroDia, ultimoDia) + 1;
  const numeroDoRdoInicial = Math.min(...numeros);
  const numeroDoRdoFinal = Math.max(...numeros);

  return ok({
    obraId,
    identificacao: {
      dias,
      quantidadeDeDias: dias.length,
      diasLancados,
      primeiroDia,
      ultimoDia,
      periodoTexto: `${formataBr(primeiroDia)} a ${formataBr(ultimoDia)}`,
      eContiguo,
      numeroDoRdoInicial,
      numeroDoRdoFinal,
      // A LISTA, nunca a faixa (17/09/2026). `numeros` já vem na ordem dos
      // dias, que o pedido normalizou crescente.
      numerosDoRdo: numeros,
      numerosDoRdoTexto: numeros.join(', '),
      bms,
      bmsTexto: bms.join(', '),
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
    // DP8: o responsável técnico VIGENTE. Um conjunto que atravessa a troca sai
    // assinado pelo atual, e não pelo que respondia em cada dia.
    responsavelTecnico: obra.responsavelTecnico,
    efetivoPessoal: calculaEfetivoMedio(efetivoPessoalPorDia),
    efetivoEquipamentos: calculaEfetivoMedio(efetivoDeEquipamentoPorDia),
    producao,
    atividades: gruposDeAtividade,
    pluviometria: calculaPluviometriaDoPeriodo(
      porDia.map((d) => ({ leitura: d.leitura, estado: d.estado })),
    ),
    comentariosCros,
    // Decisão 10.1: o bloco aparece com o rótulo e sem conteúdo na v1.
    comentarioContratante: [],
    avisos: calculaAvisosDoPeriodo({
      bms,
      quantidadeDeDias: dias.length,
      diasLancados,
      eContiguo,
      producao,
      responsavelTecnico: obra.responsavelTecnico,
    }),
  });
}

/**
 * Dia parado não tem atividade: tem um motivo, que sai na primeira linha do
 * bloco (decisão 4.1). É a mesma forma do diário, e por isso o mesmo tipo.
 */
function linhasDoDia(
  estado: EstadoDoRdo,
  registro: DiaDeObra | null,
  atividades: readonly AtividadeDoDia[],
): readonly LinhaDeAtividade[] {
  if (estado === 'parado' && registro?.motivoParada != null) {
    return [{ tipo: 'motivo-de-parada', motivo: registro.motivoParada }];
  }
  return atividades.map((a) => ({
    tipo: 'atividade',
    lancamentoId: a.lancamentoId,
    descricao: a.descricao,
    status: a.status,
  }));
}

function agrupaPorData<T extends { readonly data: DiaPuro }>(
  itens: readonly T[],
): Map<string, T[]> {
  const porData = new Map<string, T[]>();
  for (const item of itens) {
    const lista = porData.get(item.data);
    if (lista === undefined) porData.set(item.data, [item]);
    else lista.push(item);
  }
  return porData;
}

/**
 * Mensagem de recusa: nomeia no máximo três datas e diz quantas são no total.
 *
 * Mensagem é para quem vai agir (`padroes-codigo`, Erro), e uma lista de 300
 * datas não é acionável. Não carrega nome de pessoa nem rastro de pilha.
 */
function mensagemDeDiasForaDoContrato(
  fora: readonly DiaPuro[],
  inicio: DiaPuro,
  termino: DiaPuro,
): string {
  const nomeadas = fora.slice(0, DATAS_NOMEADAS_NA_RECUSA).map(formataBr);
  const lista =
    fora.length > DATAS_NOMEADAS_NA_RECUSA
      ? `${nomeadas.join(', ')} e outros`
      : nomeadas.join(', ');
  const quantidade =
    fora.length === 1 ? 'tem 1 dia fora' : `tem ${fora.length} dias fora`;
  return `O conjunto ${quantidade} do período do contrato, que vai de ${formataBr(inicio)} a ${formataBr(termino)}: ${lista}.`;
}
