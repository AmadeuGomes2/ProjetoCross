/**
 * Identificação do RDO de período — blocos 2 e 3.
 *
 * Origem das expectativas:
 *
 * - `regras-rdo` §3: `numero(dia) = dia − início do contrato`, em dias
 *   corridos, com o primeiro dia do contrato sendo o RDO 0. O contrato começa
 *   em 05/02/2026, então 01/09/2026 é o RDO 208 — o número que o fiscal
 *   reconhece. Daí 29/09 = 236, 30/09 = 237 e 01/10 = 238;
 * - `periodo.md`, 2.1: a faixa sai de `min`/`max` dos números; com um dia só,
 *   sai o número sozinho. `periodoTexto` é sempre faixa, sempre `dd/mm/aaaa`;
 * - DP7: `BM'S` lista **todos** os períodos que o conjunto cobre;
 * - `regras-rdo` §7: nunca encadear o dia seguinte a partir do anterior — é
 *   assim que aparece o dia 31 de setembro (caso obrigatório 10);
 * - `periodo.md`, 2.7: `CONJUNTO_NAO_CONTIGUO` e `DIAS_NAO_LANCADOS` são
 *   avisos de tela.
 */

import { describe, expect, it } from 'vitest';

import { montaPeriodoOuFalha } from './teste/ajuda-de-periodo';
import { registroTrabalhado } from './teste/duplas-de-periodo';
import { AVISO_DO_PERIODO } from './tipos';

describe('identificação do período', () => {
  it('atravessa a virada do mês sem inventar um 31 de setembro', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-29', '2026-09-30', '2026-10-01']);

    expect(rdo.identificacao.quantidadeDeDias).toBe(3);
    expect(rdo.identificacao.periodoTexto).toBe('29/09/2026 a 01/10/2026');
  });

  it('reconhece como contíguo o conjunto que atravessa a virada do mês', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-29', '2026-09-30', '2026-10-01']);

    expect(rdo.identificacao.eContiguo).toBe(true);
  });

  it('numera a faixa de RDO do menor ao maior número do conjunto', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-29', '2026-09-30', '2026-10-01']);

    expect(rdo.identificacao.faixaDeRdoTexto).toBe('236 a 238');
  });

  it('num período de um dia só, escreve o número sozinho e não uma faixa', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-02']);

    expect(rdo.identificacao.faixaDeRdoTexto).toBe('209');
  });

  it('lista todos os BMS que o conjunto cobre', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-30', '2026-10-01']);

    expect(rdo.identificacao.bmsTexto).toBe('7, 8');
  });

  it('deixa o BMS vazio quando nenhum período cobre dia nenhum do conjunto', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-01'], { periodos: [] });

    expect(rdo.identificacao.bms).toEqual([]);
    expect(rdo.identificacao.bmsTexto).toBe('');
  });

  it('marca como não contíguo o conjunto {02, 05, 09}', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-02', '2026-09-05', '2026-09-09']);

    expect(rdo.identificacao.eContiguo).toBe(false);
  });

  it('avisa que o conjunto não é contíguo, porque a faixa sugere continuidade', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-02', '2026-09-05', '2026-09-09']);

    expect(rdo.avisos.map((a) => a.codigo)).toContain(
      AVISO_DO_PERIODO.CONJUNTO_NAO_CONTIGUO,
    );
  });

  it('conta como dias lançados só os dias com registro', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-01', '2026-09-02', '2026-09-03'], {
      dias: [registroTrabalhado('2026-09-01'), registroTrabalhado('2026-09-03')],
    });

    expect(rdo.identificacao.quantidadeDeDias).toBe(3);
    expect(rdo.identificacao.diasLancados).toBe(2);
  });

  it('avisa quando algum dia do conjunto não foi lançado', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-01', '2026-09-02'], {
      dias: [registroTrabalhado('2026-09-01')],
    });

    expect(rdo.avisos.map((a) => a.codigo)).toContain(AVISO_DO_PERIODO.DIAS_NAO_LANCADOS);
  });

  it('devolve o conjunto normalizado que de fato usou', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-02', '2026-09-05']);

    expect(rdo.identificacao.dias).toEqual(['2026-09-02', '2026-09-05']);
    expect(rdo.identificacao.primeiroDia).toBe('2026-09-02');
    expect(rdo.identificacao.ultimoDia).toBe('2026-09-05');
  });
});
