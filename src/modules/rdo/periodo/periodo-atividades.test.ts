/**
 * Atividades e comentários do RDO de período — blocos 8 e 10.
 *
 * Origem das expectativas, `docs/arquitetura/periodo.md`:
 *
 * - DP3: atividades **todas, por data**. Nada agrupado, nada deduplicado;
 * - 2.5: dia `não lançado` gera **grupo vazio** e não some da lista, porque
 *   sumir seria corte silencioso;
 * - decisão 4.1 (`regras-rdo` §5): dia parado não tem atividade; o motivo ocupa
 *   a primeira linha do bloco;
 * - DP8: observações todas, por data;
 * - decisão 10.1: `COMENTÁRIO CONTRATANTE` sai sempre vazio na v1.
 */

import { describe, expect, it } from 'vitest';

import { montaPeriodoOuFalha } from './teste/ajuda-de-periodo';
import {
  atividadeEm,
  observacaoEm,
  registroParado,
  registroTrabalhado,
} from './teste/duplas-de-periodo';

const CONJUNTO = ['2026-09-01', '2026-09-02', '2026-09-03'];

const REGISTROS = [
  registroTrabalhado('2026-09-01'),
  registroParado('2026-09-02', 'Domingo'),
];

const ATIVIDADES = [
  atividadeEm('a1', '2026-09-01', 'Fresagem na Rua 1', 'Produção'),
  // Mesma descrição e mesmo status, de propósito: DP3 proíbe deduplicar.
  atividadeEm('a2', '2026-09-01', 'Fresagem na Rua 1', 'Produção'),
];

describe('atividades do período', () => {
  it('traz um grupo por dia do conjunto, em ordem crescente', async () => {
    const rdo = await montaPeriodoOuFalha(CONJUNTO, {
      dias: REGISTROS,
      atividades: ATIVIDADES,
    });

    expect(rdo.atividades.map((g) => g.dia)).toEqual(CONJUNTO);
  });

  it('não deduplica duas atividades iguais no mesmo dia', async () => {
    const rdo = await montaPeriodoOuFalha(CONJUNTO, {
      dias: REGISTROS,
      atividades: ATIVIDADES,
    });

    expect(rdo.atividades[0]?.linhas).toHaveLength(2);
  });

  it('põe o motivo na primeira linha do grupo do dia parado', async () => {
    const rdo = await montaPeriodoOuFalha(CONJUNTO, {
      dias: REGISTROS,
      atividades: ATIVIDADES,
    });

    expect(rdo.atividades[1]?.linhas).toEqual([
      { tipo: 'motivo-de-parada', motivo: 'Domingo' },
    ]);
  });

  it('mantém na lista o dia não lançado, com grupo vazio', async () => {
    const rdo = await montaPeriodoOuFalha(CONJUNTO, {
      dias: REGISTROS,
      atividades: ATIVIDADES,
    });

    expect(rdo.atividades[2]?.estado).toBe('nao lancado');
    expect(rdo.atividades[2]?.linhas).toEqual([]);
  });

  it('numera cada grupo com o número do RDO daquele dia', async () => {
    // 01/09/2026 é o RDO 208 (regras-rdo §3); 02/09 é 209 e 03/09 é 210.
    const rdo = await montaPeriodoOuFalha(CONJUNTO, { dias: REGISTROS });

    expect(rdo.atividades.map((g) => g.numeroDoRdo)).toEqual([208, 209, 210]);
  });
});

describe('comentários do período', () => {
  it('agrupa as observações da CROS por data', async () => {
    const rdo = await montaPeriodoOuFalha(CONJUNTO, {
      dias: REGISTROS,
      observacoes: [
        observacaoEm('o1', '2026-09-01', 'Frente liberada pela fiscalização.'),
        observacaoEm('o2', '2026-09-03', 'Equipamento em manutenção.'),
      ],
    });

    expect(rdo.comentariosCros.map((g) => g.dia)).toEqual(['2026-09-01', '2026-09-03']);
  });

  it('deixa o comentário do contratante vazio, como manda a v1', async () => {
    const rdo = await montaPeriodoOuFalha(CONJUNTO, { dias: REGISTROS });

    expect(rdo.comentarioContratante).toEqual([]);
  });
});
