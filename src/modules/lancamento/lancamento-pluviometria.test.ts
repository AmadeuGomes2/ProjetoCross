/**
 * Casos CT-133 a CT-141 — F4.4, turnos e índice pluviométrico.
 *
 * Expectativas: `docs/prd/v1.md`, Funcionalidade 4.4; decisões 2.1, 2.2 e 3.2;
 * casos obrigatórios 13 e 14; `regras-extraidas.md` seção 4.
 */

import { describe, expect, it } from 'vitest';

import { CODIGO_ERRO } from '../../shared/result';
import { criaCasosDeLancamento } from './index';
import {
  C1,
  criaPortasDeTeste,
  criaRepositorioEmMemoria,
  dia,
  OBRA_B02,
  relogioFixo,
  relogioQueAvanca,
} from './teste/duplas';

const HOJE = '2026-09-16T12:00:00.000Z';

function monta(relogio: () => Date = relogioFixo(HOJE)) {
  const repositorio = criaRepositorioEmMemoria();
  const portas = criaPortasDeTeste();
  const casos = criaCasosDeLancamento({ repositorio, portas, relogio });
  return { repositorio, portas, casos };
}

describe('F4.4 pluviometria', () => {
  it('CT-133 o lançamento tem os três turnos e o índice, e nenhuma condição de tempo', async () => {
    const { casos, repositorio } = monta();

    await casos.recebePluviometria(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        noiteAnterior: 'B',
        manha: 'B',
        tarde: 'B',
        indiceMm: '0',
      },
      { usuarioId: C1 },
    );

    const campos = Object.keys(repositorio.pluviometria.linhas[0] ?? {});
    expect(campos).toContain('noiteAnterior');
    expect(campos).toContain('manha');
    expect(campos).toContain('tarde');
    expect(campos).toContain('indiceMm');
    expect(campos.map((c) => c.toLowerCase())).not.toContain('condicaodetempo');
    expect(campos.map((c) => c.toLowerCase())).not.toContain('tempo');
  });

  it('CT-134 grava os três turnos, o índice, o autor e a hora de registro', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebePluviometria(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        noiteAnterior: 'B',
        manha: 'C',
        tarde: 'B',
        indiceMm: '8',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const linha = repositorio.pluviometria.linhas[0];
    expect(linha?.noiteAnterior).toBe('B');
    expect(linha?.manha).toBe('C');
    expect(linha?.tarde).toBe('B');
    expect(linha?.indiceMm.toString()).toBe('8');
    expect(linha?.autorId).toBe(C1);
    expect(linha?.registradoEm).toBe(HOJE);
  });

  it('CT-135 recusa a letra N, que a macro da planilha pinta e a árvore não conhece', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebePluviometria(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        noiteAnterior: 'B',
        manha: 'N',
        tarde: 'B',
        indiceMm: '0',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(repositorio.pluviometria.linhas).toHaveLength(0);
  });

  it('CT-136 aceita a letra em caixa baixa e a liga ao termo C', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebePluviometria(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        noiteAnterior: 'B',
        manha: 'c',
        tarde: 'B',
        indiceMm: '0',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    expect(repositorio.pluviometria.linhas[0]?.manha).toBe('C');
  });

  it('CT-137 recusa índice negativo', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebePluviometria(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        noiteAnterior: 'B',
        manha: 'B',
        tarde: 'B',
        indiceMm: '-3',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(repositorio.pluviometria.linhas).toHaveLength(0);
  });

  it('CT-138 aceita índice zero com chuva registrada', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebePluviometria(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        noiteAnterior: 'C',
        manha: 'B',
        tarde: 'B',
        indiceMm: '0',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    expect(repositorio.pluviometria.linhas[0]?.indiceMm.isZero()).toBe(true);
  });

  it('CT-139 aceita turno em branco', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebePluviometria(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        noiteAnterior: 'B',
        manha: 'B',
        tarde: '',
        indiceMm: '0',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    expect(repositorio.pluviometria.linhas[0]?.tarde).toBeNull();
  });

  it('CT-140 aceita os três turnos em branco com índice 12', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebePluviometria(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        noiteAnterior: '',
        manha: '',
        tarde: '',
        indiceMm: '12',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const linha = repositorio.pluviometria.linhas[0];
    expect(linha?.noiteAnterior).toBeNull();
    expect(linha?.manha).toBeNull();
    expect(linha?.tarde).toBeNull();
    expect(linha?.indiceMm.toString()).toBe('12');
  });

  it('CT-141 recusa pluviometria sem data', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebePluviometria(
      {
        obraId: OBRA_B02,
        noiteAnterior: 'B',
        manha: 'B',
        tarde: 'B',
        indiceMm: '0',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.mensagem.toLowerCase()).toContain('data');
    expect(repositorio.pluviometria.linhas).toHaveLength(0);
  });

  it('o segundo lançamento do mesmo dia corrige o primeiro: existe UMA pluviometria por dia', async () => {
    const { casos, repositorio } = monta(relogioQueAvanca(HOJE));
    await casos.recebePluviometria(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        noiteAnterior: 'B',
        manha: 'B',
        tarde: 'B',
        indiceMm: '0',
      },
      { usuarioId: C1 },
    );

    await casos.recebePluviometria(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        noiteAnterior: 'B',
        manha: 'C',
        tarde: 'I',
        indiceMm: '10',
      },
      { usuarioId: C1 },
    );

    expect(repositorio.pluviometria.linhas).toHaveLength(1);
    const vigente = await casos.obtemPluviometriaVigente(OBRA_B02, dia('2026-09-03'));
    expect(vigente.ok && vigente.valor?.manha).toBe('C');
    expect(vigente.ok && vigente.valor?.tarde).toBe('I');
    expect(vigente.ok && vigente.valor?.indiceMm.toString()).toBe('10');
  });

  it('recusa índice com mais de três casas decimais', async () => {
    const { casos } = monta();

    const r = await casos.recebePluviometria(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        noiteAnterior: 'B',
        manha: 'B',
        tarde: 'B',
        indiceMm: '1,2345',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.QUANTIDADE_CASAS_DEMAIS);
  });
});
