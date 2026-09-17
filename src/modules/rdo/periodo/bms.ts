/**
 * Os BMS que um conjunto de dias cobre.
 *
 * DP7: `BM'S` do consolidado lista **todos** os períodos que o conjunto cobre,
 * e não um só. Decisão 7.1: não existe ciclo fixo — o engenheiro cadastra os
 * períodos da obra e o RDO deriva o número pela data do dia.
 *
 * A função é pura e roda **em memória**, sobre as faixas que a porta
 * `periodosBms` entregou de uma vez. É a irmã plural de `resolveBmsDoDia`, e
 * não a mesma consulta N vezes (`docs/arquitetura/periodo.md`, 3.1).
 *
 * Data não coberta por nenhum período sai sem BMS, **nunca com erro nem com
 * bloqueio de exportação** (decisão 21.1): a lista volta com os que existem, e
 * o vazio vira aviso de tela.
 */

import { type DiaPuro, diaEstaNoIntervalo } from '../../../shared/date/dia';
import type { FaixaDeBms } from './portas';

export function resolveBmsDosDias(
  faixas: readonly FaixaDeBms[],
  dias: readonly DiaPuro[],
): readonly number[] {
  const encontrados = new Set<number>();
  for (const dia of dias) {
    for (const faixa of faixas) {
      if (diaEstaNoIntervalo(dia, faixa.dataInicial, faixa.dataFinal)) {
        encontrados.add(faixa.numero);
      }
    }
  }
  return [...encontrados].sort((a, b) => a - b);
}
