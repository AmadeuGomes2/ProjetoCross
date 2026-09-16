/**
 * Número do RDO.
 *
 * `numero(dia) = dia − data de início do contrato`, em dias corridos: inclui
 * sábado, domingo, feriado e dia parado. Em 01/09/2026, com início em
 * 05/02/2026, dá 208, que é o número que o fiscal reconhece.
 *
 * Decisão 6.1: o primeiro dia do contrato é o **RDO 0**, como na planilha. Um
 * `+1` "para começar em 1" desloca os 365 dias seguintes.
 *
 * Decisão 6.2: o número **congela no fechamento do dia**. Antes de fechar é
 * derivado; ao fechar é gravado junto com o fechamento e nunca mais muda, para
 * que corrigir a data de início da obra não renumere o que já foi entregue ao
 * fiscal. Esta é a única função do sistema que lê `numero_rdo_congelado`
 * (docs/arquitetura/v1.md, 2.17).
 */

import { type DiaPuro, diferencaEmDias } from '../../shared/date/dia';

export interface NumeroDoRdo {
  readonly numero: number;
  /** `true` quando veio do fechamento; `false` quando foi derivado agora. */
  readonly congelado: boolean;
}

export function calculaNumeroDoRdo(
  dataInicio: DiaPuro,
  dia: DiaPuro,
  congelado: number | null,
): NumeroDoRdo {
  if (congelado !== null) return { numero: congelado, congelado: true };
  return { numero: diferencaEmDias(dataInicio, dia), congelado: false };
}
