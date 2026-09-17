/**
 * Pluviometria do RDO de período — bloco 9.
 *
 * Origem das expectativas, `docs/arquitetura/periodo.md`:
 *
 * - DP4: total de mm no período, contagem de dias por letra (`B`, `C`, `I`) e
 *   contagem de dias parados;
 * - DP5: a letra do dia é a **pior dos três turnos**. A gravidade vem da
 *   taxonomia (`shared/taxonomia`): `B` bom, `C` chuva, `I` impraticável, logo
 *   `I` pior que `C` pior que `B`;
 * - PP-2: turno em branco é **ignorado** na escolha da pior letra; dia com os
 *   três em branco não conta em letra nenhuma;
 * - 2.6: o total soma o índice **dos dias com lançamento**; ausência não é
 *   zero. `diasParados` vem do **estado do dia**, não da leitura.
 *
 * Fixture, conferida à mão:
 *   01/09  B B B   0 mm   -> dia B
 *   02/09  B C I   8 mm   -> dia I   (os três discordam; vence o pior)
 *   03/09  B B C  12 mm   -> dia C
 *   04/09  - - -   3 mm   -> sem letra
 *   05/09  sem lançamento -> sem letra, e não soma mm
 *   total = 0 + 8 + 12 + 3 = 23 mm
 */

import { describe, expect, it } from 'vitest';

import { montaPeriodoOuFalha } from './teste/ajuda-de-periodo';
import { leituraEm, registroParado, registroTrabalhado } from './teste/duplas-de-periodo';
import type { PluviometriaDeUmDia } from './portas';

const CONJUNTO = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'];

const LEITURAS: readonly PluviometriaDeUmDia[] = [
  leituraEm('2026-09-01', 'B', 'B', 'B', 0),
  leituraEm('2026-09-02', 'B', 'C', 'I', 8),
  leituraEm('2026-09-03', 'B', 'B', 'C', 12),
  leituraEm('2026-09-04', null, null, null, 3),
];

const REGISTROS = [
  registroTrabalhado('2026-09-01'),
  registroTrabalhado('2026-09-02'),
  registroTrabalhado('2026-09-03'),
  registroTrabalhado('2026-09-04'),
  registroParado('2026-09-05', 'Domingo'),
];

async function montaPluviometria() {
  const rdo = await montaPeriodoOuFalha(CONJUNTO, {
    pluviometria: LEITURAS,
    dias: REGISTROS,
  });
  return rdo.pluviometria;
}

describe('pluviometria do período', () => {
  it('conta como dia impraticável o dia em que os três turnos discordam e um é I', async () => {
    expect((await montaPluviometria()).diasI).toBe(1);
  });

  it('conta como dia de chuva o dia em que a pior letra é C', async () => {
    expect((await montaPluviometria()).diasC).toBe(1);
  });

  it('conta como dia bom só o dia em que os três turnos são B', async () => {
    expect((await montaPluviometria()).diasB).toBe(1);
  });

  it('não conta em letra nenhuma o dia com os três turnos em branco', async () => {
    // 04/09 tem leitura e os três turnos vazios; 05/09 não tem leitura.
    expect((await montaPluviometria()).diasSemLeitura).toBe(2);
  });

  it('soma o índice só dos dias com lançamento', async () => {
    expect((await montaPluviometria()).totalMmTexto).toBe('23 mm');
  });

  it('tira a contagem de dias parados do estado do dia, não da leitura', async () => {
    expect((await montaPluviometria()).diasParados).toBe(1);
  });

  it('ignora o turno em branco ao escolher a pior letra do dia', async () => {
    // Só a tarde foi lançada, e com C: o dia é um dia de chuva, não um dia sem
    // leitura. PP-2 do contrato.
    const rdo = await montaPeriodoOuFalha(['2026-09-01'], {
      pluviometria: [leituraEm('2026-09-01', null, null, 'C', 4)],
      dias: [registroTrabalhado('2026-09-01')],
    });

    expect(rdo.pluviometria.diasC).toBe(1);
  });

  it('não confunde índice zero com ausência de leitura', async () => {
    // Choveu zero milímetro em um dia e o outro não foi lançado: o total é
    // 0 mm, e o dia sem lançamento não vira zero.
    const rdo = await montaPeriodoOuFalha(['2026-09-01', '2026-09-02'], {
      pluviometria: [leituraEm('2026-09-01', 'B', 'B', 'B', 0)],
      dias: [registroTrabalhado('2026-09-01'), registroTrabalhado('2026-09-02')],
    });

    expect(rdo.pluviometria.totalMmTexto).toBe('0 mm');
    expect(rdo.pluviometria.diasSemLeitura).toBe(1);
  });
});
