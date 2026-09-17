/**
 * Apoio dos testes do consolidado: monta o RDO de período contra as duplas e
 * falha alto quando a montagem devolve erro, para que a asserção do caso fique
 * legível.
 */

import { OBRA } from '../../teste/duplas';
import { montaRdoDePeriodo } from '../monta-rdo-de-periodo';
import type { RdoDePeriodo } from '../tipos';
import {
  criaPortasDePeriodoFalsas,
  type DadosDePeriodoFalsos,
  dia,
} from './duplas-de-periodo';

export async function montaPeriodoOuFalha(
  dias: readonly string[],
  ajustes: Partial<DadosDePeriodoFalsos> = {},
): Promise<RdoDePeriodo> {
  const r = await montaRdoDePeriodo(
    OBRA,
    dias.map(dia),
    criaPortasDePeriodoFalsas(ajustes),
  );
  if (!r.ok) throw new Error(`montagem recusada: ${r.erro.codigo}`);
  return r.valor;
}
