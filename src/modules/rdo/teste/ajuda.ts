/**
 * Apoio dos testes do RDO: monta o documento contra as duplas e falha alto
 * quando a montagem devolve erro, para que a asserção do caso fique legível.
 */

import { montaRdoDiario } from '../monta-rdo-diario';
import type { RdoDiario } from '../tipos';
import { criaPortasFalsas, type DadosFalsos, dia, OBRA } from './duplas';

export async function montaOuFalha(
  diaConsultado: string,
  ajustes: Partial<DadosFalsos> = {},
): Promise<RdoDiario> {
  const r = await montaRdoDiario(OBRA, dia(diaConsultado), criaPortasFalsas(ajustes));
  if (!r.ok) throw new Error(`montagem recusada: ${r.erro.codigo}`);
  return r.valor;
}
