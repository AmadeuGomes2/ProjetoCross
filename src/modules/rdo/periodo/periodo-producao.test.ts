/**
 * Produção controlada do RDO de período — bloco 7.
 *
 * Origem das expectativas, `docs/arquitetura/periodo.md`, DP6 e 2.4:
 *
 * - `EXEC.` = executado **no período**, somando só os lançamentos cuja data
 *   **pertence ao conjunto**. Para `{02, 05, 09}` o dia 03 fica de fora;
 * - `ACUM.` = acumulado da obra **até o último dia** do conjunto, sobre todos
 *   os dias, **inclusive os que não estão no conjunto**;
 * - `%` = acumulado ÷ quantidade de projeto (`regras-rdo`, §2);
 * - decisão 17.2: valor zero sai como `-`, não como `0,00` nem em branco.
 *
 * As contas, feitas à mão sobre a fixture:
 *   lançamentos de REC.(FRESA+CAPA): 02/09 = 10, 03/09 = 5, 05/09 = 20,
 *   09/09 = 30, 10/09 = 7.
 *   Conjunto {02, 05, 09}:  EXEC. = 10 + 20 + 30 = 60
 *                           ACUM. = 10 + 5 + 20 + 30 = 65   (o 03 entra, o 10 não)
 *                           %     = 65 / 2210,392 = 2,940655... -> 2,94%
 */

import { describe, expect, it } from 'vitest';

import { montaPeriodoOuFalha } from './teste/ajuda-de-periodo';
import {
  producaoEm,
  registroTrabalhado,
  SERVICO_FRESA_BINDER,
  SERVICO_FRESA_CAPA,
} from './teste/duplas-de-periodo';
import type { LancamentoDeProducao } from '../portas';

const LANCAMENTOS: readonly LancamentoDeProducao[] = [
  producaoEm('p1', SERVICO_FRESA_CAPA, '2026-09-02', '10'),
  producaoEm('p2', SERVICO_FRESA_CAPA, '2026-09-03', '5'),
  producaoEm('p3', SERVICO_FRESA_CAPA, '2026-09-05', '20'),
  producaoEm('p4', SERVICO_FRESA_CAPA, '2026-09-09', '30'),
  producaoEm('p5', SERVICO_FRESA_CAPA, '2026-09-10', '7'),
];

const CONJUNTO_NAO_CONTIGUO = ['2026-09-02', '2026-09-05', '2026-09-09'];

const DIAS_LANCADOS = [
  registroTrabalhado('2026-09-02'),
  registroTrabalhado('2026-09-05'),
  registroTrabalhado('2026-09-09'),
];

describe('produção do período', () => {
  it('não soma no EXEC. o dia que ficou fora do conjunto', async () => {
    const rdo = await montaPeriodoOuFalha(CONJUNTO_NAO_CONTIGUO, {
      producao: LANCAMENTOS,
      dias: DIAS_LANCADOS,
    });

    expect(linha(rdo, SERVICO_FRESA_CAPA).executadoTexto).toBe('60,00');
  });

  it('soma no ACUM. o dia que ficou fora do conjunto', async () => {
    const rdo = await montaPeriodoOuFalha(CONJUNTO_NAO_CONTIGUO, {
      producao: LANCAMENTOS,
      dias: DIAS_LANCADOS,
    });

    expect(linha(rdo, SERVICO_FRESA_CAPA).acumuladoTexto).toBe('65,00');
  });

  it('não soma no ACUM. o lançamento posterior ao último dia do conjunto', async () => {
    // O lançamento de 10/09 vale 7 e não aparece nem em EXEC. nem em ACUM.:
    // o corte é o último dia do conjunto, 09/09.
    const rdo = await montaPeriodoOuFalha(CONJUNTO_NAO_CONTIGUO, {
      producao: LANCAMENTOS,
      dias: DIAS_LANCADOS,
    });

    expect(linha(rdo, SERVICO_FRESA_CAPA).lancamentosDoAcumulado).toEqual([
      'p1',
      'p2',
      'p3',
      'p4',
    ]);
  });

  it('lista no EXEC. só os lançamentos dos dias do conjunto', async () => {
    const rdo = await montaPeriodoOuFalha(CONJUNTO_NAO_CONTIGUO, {
      producao: LANCAMENTOS,
      dias: DIAS_LANCADOS,
    });

    expect(linha(rdo, SERVICO_FRESA_CAPA).lancamentosDoExecutado).toEqual([
      'p1',
      'p3',
      'p4',
    ]);
  });

  it('tira o percentual do acumulado dividido pela quantidade de projeto', async () => {
    const rdo = await montaPeriodoOuFalha(CONJUNTO_NAO_CONTIGUO, {
      producao: LANCAMENTOS,
      dias: DIAS_LANCADOS,
    });

    expect(linha(rdo, SERVICO_FRESA_CAPA).percentualTexto).toBe('2,94%');
  });

  it('soma só os dias que têm lançamento quando a produção não é diária', async () => {
    // Três dias no conjunto, um único lançamento, de 12,5 em 02/09.
    const rdo = await montaPeriodoOuFalha(['2026-09-01', '2026-09-02', '2026-09-03'], {
      producao: [producaoEm('q1', SERVICO_FRESA_BINDER, '2026-09-02', '12,5')],
      dias: [
        registroTrabalhado('2026-09-01'),
        registroTrabalhado('2026-09-02'),
        registroTrabalhado('2026-09-03'),
      ],
    });

    expect(linha(rdo, SERVICO_FRESA_BINDER).executadoTexto).toBe('12,50');
  });

  it('exibe traço no serviço sem lançamento nenhum no período', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-01', '2026-09-02', '2026-09-03'], {
      producao: [producaoEm('q1', SERVICO_FRESA_BINDER, '2026-09-02', '12,5')],
      dias: [registroTrabalhado('2026-09-02')],
    });

    expect(linha(rdo, SERVICO_FRESA_CAPA).executadoTexto).toBe('-');
  });

  it('traz sempre as quatro linhas de serviço controlado, mesmo zeradas', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-01'], {
      dias: [registroTrabalhado('2026-09-01')],
    });

    expect(rdo.producao).toHaveLength(4);
  });
});

function linha(
  rdo: Awaited<ReturnType<typeof montaPeriodoOuFalha>>,
  servicoId: string,
): (typeof rdo.producao)[number] {
  const achada = rdo.producao.find((l) => l.servicoId === servicoId);
  if (achada === undefined) throw new Error(`serviço ausente no bloco 7: ${servicoId}`);
  return achada;
}
