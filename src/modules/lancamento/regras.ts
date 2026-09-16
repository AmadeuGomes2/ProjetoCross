/**
 * Regras puras do lançamento: sem banco, sem relógio real, sem rede.
 *
 * Tudo aqui é função de entrada para saída, testável isoladamente. O que
 * precisa do mundo — data de hoje, período da obra — chega por argumento.
 */

import type { DiaPuro } from '../../shared/date/dia';
import { hojeNaObra, type Fuso } from '../../shared/date/fuso';
import {
  deTextoDoUsuario,
  formataBr as formataQuantidade,
  maiorQue,
  zero,
  type Quantidade,
} from '../../shared/decimal';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  erroDeEntrada,
  ok,
  type ErroDeDominio,
  type ErroDeEntrada,
  type Result,
} from '../../shared/result';
import { chaveDeTermo, LETRAS_DE_TURNO, type LetraDeTurno } from '../../shared/taxonomia';
import type { PeriodoDaObra } from './portas';
import type { AvisoDeLancamento, DiaDeObra } from './tipos';

/**
 * Recorte das pontas, e SÓ das pontas.
 *
 * Decisão 17.1: espaço sobrando no fim é resto de digitação e some. Espaço no
 * MEIO é do texto e fica — `PAVIMENTAÇÃO  - BLOCO 02` prova que o duplo
 * interno é conteúdo, não sujeira.
 */
export function recortaPontas(bruto: string): string {
  return bruto.trim();
}

export function exigeTextoNaoVazio(
  bruto: string,
  mensagem: string,
  campo: string,
): Result<string, ErroDeEntrada> {
  const texto = recortaPontas(bruto);
  if (texto === '') {
    return erro(erroDeEntrada(CODIGO_ERRO.TERMO_VAZIO, mensagem, campo));
  }
  return ok(texto);
}

/** Motivo de dia parado: texto livre OBRIGATÓRIO (20.1), nunca lista fechada. */
export function exigeMotivoDeParada(bruto: string): Result<string, ErroDeEntrada> {
  const texto = recortaPontas(bruto);
  if (texto === '') {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.MOTIVO_OBRIGATORIO,
        'Informe o motivo da parada.',
        'motivoParada',
      ),
    );
  }
  return ok(texto);
}

const TEXTO_ZERO = /^[+-]?0+(?:[.,]0+)?$/;

/**
 * Índice pluviométrico em mm.
 *
 * Difere da produção num único ponto: **zero é válido** (decisão 3.2, chuva
 * registrada sem acumular milímetro é a garoa). Fora isso vale a mesma regra de
 * `shared/decimal`: aceita vírgula, recusa mais de três casas em vez de
 * arredondar, recusa negativo. Reaproveitar `deTextoDoUsuario` é de propósito:
 * uma segunda implementação de "número digitado por pessoa" é uma segunda
 * verdade sobre arredondamento.
 */
export function indicePluviometricoDeTexto(
  bruto: string,
): Result<Quantidade, ErroDeEntrada> {
  const resultado = deTextoDoUsuario(bruto);
  if (resultado.ok) return resultado;
  if (
    resultado.erro.codigo === CODIGO_ERRO.QUANTIDADE_NAO_POSITIVA &&
    TEXTO_ZERO.test(recortaPontas(bruto))
  ) {
    return ok(zero());
  }
  if (resultado.erro.codigo === CODIGO_ERRO.QUANTIDADE_NAO_POSITIVA) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.QUANTIDADE_NAO_POSITIVA,
        'O índice pluviométrico não pode ser negativo.',
        'indiceMm',
      ),
    );
  }
  return resultado;
}

/**
 * Letra do turno.
 *
 * Branco é ACEITO (2.2): o encarregado lança de manhã e nem sempre sabe a
 * tarde; exigir os três faria ele inventar um. A letra `N` da macro VBA é
 * recusada: a árvore do resumo do dia não a conhece.
 */
export function letraDeTurnoDeTexto(
  bruto: string | null | undefined,
  campo: string,
): Result<LetraDeTurno | null, ErroDeEntrada> {
  if (bruto === null || bruto === undefined) return ok(null);
  const texto = recortaPontas(bruto);
  if (texto === '') return ok(null);
  const achada = LETRAS_DE_TURNO.find((l) => chaveDeTermo(l) === chaveDeTermo(texto));
  if (achada === undefined) {
    return erro(
      erroDeEntrada(CODIGO_ERRO.TERMO_VAZIO, 'O turno aceita B, C, I ou branco.', campo),
    );
  }
  return ok(achada);
}

/**
 * Validação 13.1 e 13.2, nesta ordem.
 *
 * "Hoje" é o hoje do FUSO DA OBRA, nunca o relógio cru do servidor nem o do
 * aparelho: 17/09 02:00 em UTC ainda é 16/09 em São Paulo, e recusar o
 * lançamento de hoje é o jeito mais rápido de fazer o encarregado desistir.
 */
export function validaDataDeLancamento(
  data: DiaPuro,
  periodo: PeriodoDaObra,
  fuso: Fuso,
  relogio: () => Date,
): Result<DiaPuro, ErroDeDominio> {
  if (data < periodo.dataInicio || data > periodo.dataTermino) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.DATA_FORA_DO_PERIODO_DA_OBRA,
        'A data está fora do período da obra.',
      ),
    );
  }
  if (data > hojeNaObra(fuso, relogio)) {
    return erro(
      erroDeDominio(CODIGO_ERRO.DATA_FUTURA, 'Não se lança dia que ainda não aconteceu.'),
    );
  }
  return ok(data);
}

export function eDiaFechado(dia: DiaDeObra | null): boolean {
  return dia !== null && dia.fechadoEm !== null;
}

export const ERRO_DIA_FECHADO: ErroDeDominio = erroDeDominio(
  CODIGO_ERRO.DIA_FECHADO,
  'O dia está fechado. A mudança precisa ser uma retificação.',
);

export const ERRO_DIA_PARADO: ErroDeDominio = erroDeDominio(
  CODIGO_ERRO.DIA_PARADO_NAO_ACEITA_ATIVIDADE,
  'O dia está marcado como parado e não aceita atividade.',
);

/**
 * Decisão 24.1: marcar como parado um dia que já tem atividade é recusado, com
 * mensagem pedindo para remover as atividades antes. **Nada é apagado em
 * silêncio** para acomodar a troca de estado.
 *
 * Reaproveita o código `DIA_PARADO_NAO_ACEITA_ATIVIDADE` porque o assunto é o
 * mesmo — dia parado e atividade não convivem —, só a direção muda. Um código
 * próprio exigiria mexer em `src/shared/result`, que é do coordenador.
 */
export const ERRO_PARADO_COM_ATIVIDADE: ErroDeDominio = erroDeDominio(
  CODIGO_ERRO.DIA_PARADO_NAO_ACEITA_ATIVIDADE,
  'Este dia já tem atividade lançada. Remova as atividades antes de marcá-lo como parado.',
);

export const ERRO_SEM_PERMISSAO: ErroDeDominio = erroDeDominio(
  CODIGO_ERRO.SEM_PERMISSAO,
  'Esta ação é do engenheiro responsável pela obra.',
);

export const ERRO_NAO_ENCONTRADO: ErroDeDominio = erroDeDominio(
  CODIGO_ERRO.NAO_ENCONTRADO,
  'Lançamento não encontrado nesta obra.',
);

/**
 * Avisos da produção (decisão 12.1 e caso obrigatório 6).
 *
 * Nenhum deles bloqueia: aditivo de contrato é normal e o dado medido não pode
 * ser perdido. A planilha não avisava nada, que é o outro extremo.
 *
 * "Acima" é ESTRITAMENTE maior: o acumulado igual ao projeto é 100%, e um `>=`
 * no lugar do `>` faria o RDO de 100% nascer com aviso indevido.
 */
export function avisosDaProducao(entrada: {
  readonly diaEstaParado: boolean;
  readonly diaTemAtividade: boolean;
  readonly acumulado: Quantidade;
  readonly quantidadeProjeto: Quantidade | null;
}): AvisoDeLancamento[] {
  const avisos: AvisoDeLancamento[] = [];
  if (entrada.diaEstaParado) {
    avisos.push({
      codigo: 'PRODUCAO_EM_DIA_PARADO',
      mensagem: 'Há produção lançada num dia marcado como parado.',
    });
  }
  if (!entrada.diaTemAtividade) {
    avisos.push({
      codigo: 'PRODUCAO_SEM_ATIVIDADE',
      mensagem: 'Há produção lançada num dia sem nenhuma atividade.',
    });
  }
  const projeto = entrada.quantidadeProjeto;
  if (projeto !== null && maiorQue(entrada.acumulado, projeto)) {
    avisos.push({
      codigo: 'ACUMULADO_ACIMA_DO_PROJETO',
      mensagem: `O acumulado de ${formataQuantidade(entrada.acumulado)} ultrapassa a quantidade de projeto de ${formataQuantidade(projeto)}.`,
    });
  }
  return avisos;
}
