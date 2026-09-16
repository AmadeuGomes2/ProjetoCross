/**
 * Casos CT-086 a CT-095 — F4.1, estado do dia.
 *
 * Expectativas: `docs/prd/v1.md`, Funcionalidade 4.1; decisões 4.1, 4.2, 4.3,
 * 20.1 e 24.1 de `docs/prd/v1-decisoes.md`; `regras-extraidas.md` seção 5.
 * Nenhuma expectativa foi lida da implementação.
 */

import { describe, expect, it } from 'vitest';

import { CODIGO_ERRO } from '../../shared/result';
import { criaCasosDeLancamento } from './index';
import {
  C1,
  criaPortasDeTeste,
  criaRepositorioEmMemoria,
  dia,
  E1,
  OBRA_B02,
  relogioFixo,
} from './teste/duplas';

function monta() {
  const repositorio = criaRepositorioEmMemoria();
  const portas = criaPortasDeTeste();
  const casos = criaCasosDeLancamento({
    repositorio,
    portas,
    relogio: relogioFixo('2026-09-16T12:00:00.000Z'),
  });
  return { repositorio, portas, casos };
}

describe('F4.1 estado do dia', () => {
  it('CT-086 grava o dia trabalhado com autor e hora de registro', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.declaraEstadoDoDia(
      { obraId: OBRA_B02, data: dia('2026-09-03'), estado: 'trabalhado' },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-03'));
    expect(diaDeObra?.estado).toBe('trabalhado');
    expect(diaDeObra?.registradoPor).toBe(C1);
    // A hora de registro é campo diferente da data a que o dia se refere.
    expect(diaDeObra?.registradoEm).toBe('2026-09-16T12:00:00.000Z');
    expect(diaDeObra?.data).toBe('2026-09-03');
  });

  it('CT-087 grava o dia parado com motivo e zero atividades', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.declaraEstadoDoDia(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-06'),
        estado: 'parado',
        motivoParada: 'Domingo',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-06'));
    expect(diaDeObra?.estado).toBe('parado');
    expect(diaDeObra?.motivoParada).toBe('Domingo');
    const atividades = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-06'));
    expect(atividades.ok && atividades.valor).toHaveLength(0);
  });

  it('CT-088 recusa dia parado sem motivo e não cria registro nenhum', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebeEstadoDoDia(
      {
        obraId: OBRA_B02,
        data: '2026-09-06',
        estado: 'parado',
        motivoParada: '',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.MOTIVO_OBRIGATORIO);
    expect(!r.ok && r.erro.mensagem.toLowerCase()).toContain('motivo da parada');
    expect(await repositorio.dia.obtem(OBRA_B02, dia('2026-09-06'))).toBeNull();
  });

  it('CT-089 recusa motivo só com espaços, porque as pontas são recortadas antes', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebeEstadoDoDia(
      {
        obraId: OBRA_B02,
        data: '2026-09-06',
        estado: 'parado',
        motivoParada: '   ',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.MOTIVO_OBRIGATORIO);
    expect(await repositorio.dia.obtem(OBRA_B02, dia('2026-09-06'))).toBeNull();
  });

  it('CT-090 aceita motivo fora das oito sugestões, porque a lista não é taxonomia', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.declaraEstadoDoDia(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-09'),
        estado: 'parado',
        motivoParada: 'Visita técnica da concessionária',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-09'));
    expect(diaDeObra?.motivoParada).toBe('Visita técnica da concessionária');
  });

  it('CT-091 recusa atividade em dia parado sem mudar o estado do dia', async () => {
    const { casos, repositorio, portas } = monta();
    await casos.declaraEstadoDoDia(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-06'),
        estado: 'parado',
        motivoParada: 'Domingo',
      },
      { usuarioId: C1 },
    );

    const r = await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-06'),
        descricao: 'Limpeza do pátio',
        status: { tipo: 'id', id: portas.idDoStatus('Limpeza') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DIA_PARADO_NAO_ACEITA_ATIVIDADE);
    expect(!r.ok && r.erro.mensagem.toLowerCase()).toContain('parado');
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-06'));
    expect(diaDeObra?.estado).toBe('parado');
    const atividades = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-06'));
    expect(atividades.ok && atividades.valor).toHaveLength(0);
  });

  it('CT-092 muda o dia aberto de parado para trabalhado e apaga o motivo', async () => {
    const { casos, repositorio, portas } = monta();
    await casos.declaraEstadoDoDia(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-06'),
        estado: 'parado',
        motivoParada: 'Domingo',
      },
      { usuarioId: C1 },
    );

    const troca = await casos.declaraEstadoDoDia(
      { obraId: OBRA_B02, data: dia('2026-09-06'), estado: 'trabalhado' },
      { usuarioId: C1 },
    );

    expect(troca.ok).toBe(true);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-06'));
    expect(diaDeObra?.estado).toBe('trabalhado');
    // O motivo não pode ficar pendurado: ele sai na primeira linha do bloco 8.
    expect(diaDeObra?.motivoParada).toBeNull();
    const atividade = await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-06'),
        descricao: 'Limpeza do pátio',
        status: { tipo: 'id', id: portas.idDoStatus('Limpeza') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );
    expect(atividade.ok).toBe(true);
  });

  it('CT-093 devolve "não lançado" para o dia em que ninguém lançou nada', async () => {
    const { casos } = monta();

    const estado = await casos.estadoNaTela(OBRA_B02, dia('2026-09-07'));

    expect(estado.ok && estado.valor).toBe('nao_lancado');
  });

  it('CT-094 não cria registro de dia por antecipação', async () => {
    const { casos, repositorio } = monta();

    await casos.estadoNaTela(OBRA_B02, dia('2026-09-07'));
    await casos.obtemPreenchimentoInicial(OBRA_B02, dia('2026-09-07'));

    expect(repositorio.dias.size).toBe(0);
    expect(await repositorio.dia.obtem(OBRA_B02, dia('2026-09-07'))).toBeNull();
  });

  it('CT-095 conta zero atividades no dia parado, porque o motivo não é atividade', async () => {
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

    const atividades = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-06'));

    expect(atividades.ok && atividades.valor).toHaveLength(0);
  });

  it('decisão 24.1: recusa marcar como parado o dia que já tem atividade, sem apagar nada', async () => {
    const { casos, repositorio, portas } = monta();
    await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Fresagem da Rua A',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    const r = await casos.declaraEstadoDoDia(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        estado: 'parado',
        motivoParada: 'Chuva',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.mensagem.toLowerCase()).toContain('remova');
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-03'));
    expect(diaDeObra?.estado).toBe('trabalhado');
    const atividades = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    expect(atividades.ok && atividades.valor).toHaveLength(1);
  });

  it('o engenheiro também declara o estado do dia', async () => {
    const { casos } = monta();

    const r = await casos.declaraEstadoDoDia(
      { obraId: OBRA_B02, data: dia('2026-09-03'), estado: 'trabalhado' },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
  });
});
