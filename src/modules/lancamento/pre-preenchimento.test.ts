/**
 * Casos CT-161 a CT-164 — F4.7, pré-preenchimento a partir do dia anterior.
 *
 * Expectativa: `docs/prd/v1.md`, Funcionalidade 4.7, e decisão 15.1
 * ("vem só o estado do dia e os turnos do dia anterior").
 */

import { describe, expect, it } from 'vitest';

import { criaCasosDeLancamento } from './index';
import {
  C1,
  criaPortasDeTeste,
  criaRepositorioEmMemoria,
  dia,
  OBRA_B02,
  relogioQueAvanca,
} from './teste/duplas';

const HOJE = '2026-09-16T12:00:00.000Z';

function monta() {
  const repositorio = criaRepositorioEmMemoria();
  const portas = criaPortasDeTeste();
  const casos = criaCasosDeLancamento({
    repositorio,
    portas,
    relogio: relogioQueAvanca(HOJE),
  });
  return { repositorio, portas, casos };
}

async function lancaODiaDois(
  casos: ReturnType<typeof criaCasosDeLancamento>,
  portas: ReturnType<typeof criaPortasDeTeste>,
) {
  await casos.declaraEstadoDoDia(
    { obraId: OBRA_B02, data: dia('2026-09-02'), estado: 'trabalhado' },
    { usuarioId: C1 },
  );
  await casos.recebePluviometria(
    {
      obraId: OBRA_B02,
      data: '2026-09-02',
      noiteAnterior: 'B',
      manha: 'B',
      tarde: 'B',
      indiceMm: '4',
    },
    { usuarioId: C1 },
  );
  for (const descricao of ['Primeira', 'Segunda', 'Terceira']) {
    await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-02'),
        descricao,
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );
  }
}

describe('F4.7 pré-preenchimento', () => {
  it('CT-161 traz o estado e os turnos do dia anterior, e nenhuma atividade', async () => {
    const { casos, portas } = monta();
    await lancaODiaDois(casos, portas);

    const r = await casos.obtemPreenchimentoInicial(OBRA_B02, dia('2026-09-03'));

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.estadoNaTela).toBe('nao_lancado');
    expect(r.valor.estadoSugerido).toBe('trabalhado');
    expect(r.valor.turnosSugeridos).toEqual({
      noiteAnterior: 'B',
      manha: 'B',
      tarde: 'B',
    });
    // Atividade não se repete: confirmar sem ler produziria atividade falsa.
    expect(r.valor.atividadesSugeridas).toHaveLength(0);
  });

  it('CT-162 não pré-preenche o índice em mm, que é medição e não hábito', async () => {
    const { casos, portas } = monta();
    await lancaODiaDois(casos, portas);

    const r = await casos.obtemPreenchimentoInicial(OBRA_B02, dia('2026-09-03'));

    expect(r.ok && r.valor.indiceMm).toBeNull();
  });

  it('CT-163 abrir a tela não grava nada: o dia continua não lançado', async () => {
    const { casos, portas, repositorio } = monta();
    await lancaODiaDois(casos, portas);

    await casos.obtemPreenchimentoInicial(OBRA_B02, dia('2026-09-03'));

    expect(await repositorio.dia.obtem(OBRA_B02, dia('2026-09-03'))).toBeNull();
    const estado = await casos.estadoNaTela(OBRA_B02, dia('2026-09-03'));
    expect(estado.ok && estado.valor).toBe('nao_lancado');
  });

  it('CT-164 confirmar sem alterar grava uma vez e não mexe no dia anterior', async () => {
    const { casos, portas, repositorio } = monta();
    await lancaODiaDois(casos, portas);

    const r = await casos.confirmaDia(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        estado: 'trabalhado',
        turnos: { noiteAnterior: 'B', manha: 'B', tarde: 'B' },
        indiceMm: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-03'));
    expect(diaDeObra?.estado).toBe('trabalhado');
    expect(diaDeObra?.registradoPor).toBe(C1);
    const pluviometria = repositorio.pluviometria.linhas.filter(
      (l) => l.data === '2026-09-03',
    );
    expect(pluviometria).toHaveLength(1);
    const doDiaDois = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-02'));
    expect(doDiaDois.ok && doDiaDois.valor).toHaveLength(3);
    const doDiaTres = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    expect(doDiaTres.ok && doDiaTres.valor).toHaveLength(0);
  });

  it('não sugere nada quando o dia anterior não foi lançado', async () => {
    const { casos } = monta();

    const r = await casos.obtemPreenchimentoInicial(OBRA_B02, dia('2026-09-03'));

    expect(r.ok && r.valor.estadoSugerido).toBeNull();
    expect(r.ok && r.valor.turnosSugeridos).toBeNull();
  });

  it('não herda o motivo da parada do dia anterior: "Domingo" numa segunda-feira seria falso', async () => {
    const { casos } = monta();
    await casos.declaraEstadoDoDia(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-06'),
        estado: 'parado',
        motivoParada: 'Domingo',
      },
      { usuarioId: C1 },
    );

    const r = await casos.obtemPreenchimentoInicial(OBRA_B02, dia('2026-09-07'));

    expect(r.ok && r.valor.estadoSugerido).toBe('parado');
    expect(Object.keys(r.ok ? r.valor : {})).not.toContain('motivoSugerido');
  });

  it('o dia já lançado abre com o próprio estado, e não com o do anterior', async () => {
    const { casos, portas } = monta();
    await lancaODiaDois(casos, portas);
    await casos.declaraEstadoDoDia(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        estado: 'parado',
        motivoParada: 'Chuva',
      },
      { usuarioId: C1 },
    );

    const r = await casos.obtemPreenchimentoInicial(OBRA_B02, dia('2026-09-03'));

    expect(r.ok && r.valor.estadoNaTela).toBe('parado');
  });
});
