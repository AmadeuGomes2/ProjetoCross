/**
 * Casos CT-097 a CT-120 — F4.2, lançar atividades com status.
 *
 * Expectativas: `docs/prd/v1.md`, Funcionalidade 4.2; casos obrigatórios 7, 10,
 * 11, 13, 14 e 15 de `.claude/skills/template-caso-teste`; decisões 13.1 e 13.2.
 */

import { describe, expect, it } from 'vitest';

import { CODIGO_ERRO } from '../../shared/result';
import { criaCasosDeLancamento } from './index';
import type { ConfiguracaoDasPortas } from './teste/duplas';
import {
  C1,
  criaPortasDeTeste,
  criaRepositorioEmMemoria,
  dia,
  E1,
  OBRA_OUTRA,
  OBRA_B02,
  relogioFixo,
  relogioQueAvanca,
} from './teste/duplas';

/** Hoje, no fuso da obra, é 16/09/2026: 12:00Z é 09:00 em São Paulo. */
const HOJE = '2026-09-16T12:00:00.000Z';

function monta(
  configuracao: Partial<ConfiguracaoDasPortas> = {},
  relogio: () => Date = relogioFixo(HOJE),
) {
  const repositorio = criaRepositorioEmMemoria();
  const portas = criaPortasDeTeste(configuracao);
  const casos = criaCasosDeLancamento({ repositorio, portas, relogio });
  return { repositorio, portas, casos };
}

describe('F4.2 lançar atividade', () => {
  it('CT-097 grava data, descrição, status, autor e hora de registro', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Fresagem da Rua A, estacas 10 a 14',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const linha = repositorio.atividades.linhas[0];
    expect(linha?.data).toBe('2026-09-03');
    expect(linha?.descricao).toBe('Fresagem da Rua A, estacas 10 a 14');
    expect(linha?.statusId).toBe(portas.idDoStatus('Produção'));
    expect(linha?.autorId).toBe(C1);
    expect(linha?.registradoEm).toBe(HOJE);
  });

  it('CT-098 não guarda condição de tempo nenhuma na atividade', async () => {
    const { casos, portas, repositorio } = monta();

    await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Fresagem',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    const linha = repositorio.atividades.linhas[0];
    const campos = Object.keys(linha ?? {}).map((c) => c.toLowerCase());
    expect(campos).not.toContain('tempo');
    expect(campos).not.toContain('condicaodetempo');
  });

  it('CT-099 recusa atividade sem status e pede o status na mensagem', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebeAtividade(
      { obraId: OBRA_B02, data: '2026-09-03', descricao: 'Fresagem da Rua A' },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.mensagem.toLowerCase()).toContain('status');
    expect(repositorio.atividades.linhas).toHaveLength(0);
  });

  it('CT-100 recusa atividade com descrição vazia', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.recebeAtividade(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        descricao: '',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.TERMO_VAZIO);
    expect(repositorio.atividades.linhas).toHaveLength(0);
  });

  it('CT-101 recusa status fora da taxonomia e não cria termo novo', async () => {
    const { casos, portas, repositorio } = monta();
    const antes = portas.contaStatus();

    const r = await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Fresagem',
        status: { tipo: 'termo', termo: 'Produçao' },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(repositorio.atividades.linhas).toHaveLength(0);
    expect(portas.contaStatus()).toBe(antes);
  });

  it('CT-102 aceita status com caixa e espaços divergentes, ligando ao termo existente', async () => {
    const { casos, portas, repositorio } = monta();
    const antes = portas.contaStatus();

    const r = await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Fresagem',
        status: { tipo: 'termo', termo: ' perca de Produção ' },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    expect(repositorio.atividades.linhas[0]?.statusId).toBe(
      portas.idDoStatus('Perca de produção'),
    );
    expect(portas.contaStatus()).toBe(antes);
  });

  it('CT-103 aceita a décima quinta atividade do dia', async () => {
    const { casos, portas } = monta({}, relogioQueAvanca(HOJE));
    for (let i = 1; i <= 14; i += 1) {
      await casos.lancaAtividade(
        {
          obraId: OBRA_B02,
          data: dia('2026-09-03'),
          descricao: `Atividade ${i}`,
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
          chaveDeRascunho: null,
        },
        { usuarioId: C1 },
      );
    }

    const r = await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Sinalização',
        status: { tipo: 'id', id: portas.idDoStatus('Informativo') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    expect(lista.ok && lista.valor).toHaveLength(15);
  });

  it('CT-104 aceita a décima sexta atividade: transbordo nunca é truncamento', async () => {
    const { casos, portas } = monta({}, relogioQueAvanca(HOJE));
    for (let i = 1; i <= 15; i += 1) {
      await casos.lancaAtividade(
        {
          obraId: OBRA_B02,
          data: dia('2026-09-03'),
          descricao: `Atividade ${i}`,
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
          chaveDeRascunho: null,
        },
        { usuarioId: C1 },
      );
    }

    const r = await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Sinalização',
        status: { tipo: 'id', id: portas.idDoStatus('Informativo') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    expect(lista.ok && lista.valor).toHaveLength(16);
  });

  it('CT-105 grava o dia escolhido, não o do relógio em UTC', async () => {
    // O relógio do servidor marca 04/09 00:10 em UTC, que é 03/09 21:10 na obra.
    const { casos, portas, repositorio } = monta(
      {},
      relogioFixo('2026-09-04T00:10:00.000Z'),
    );

    const r = await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Compactação',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    expect(repositorio.atividades.linhas[0]?.data).toBe('2026-09-03');
  });

  it('CT-106 guarda a hora de registro separada da data do lançamento', async () => {
    const { casos, portas, repositorio } = monta(
      {},
      relogioFixo('2026-09-04T00:10:00.000Z'),
    );

    await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Compactação',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    const linha = repositorio.atividades.linhas[0];
    expect(linha?.data).toBe('2026-09-03');
    expect(linha?.registradoEm).toBe('2026-09-04T00:10:00.000Z');
  });

  it('CT-107 recusa atividade sem data', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.recebeAtividade(
      {
        obraId: OBRA_B02,
        descricao: 'Compactação',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.mensagem.toLowerCase()).toContain('data');
    expect(repositorio.atividades.linhas).toHaveLength(0);
  });

  it('CT-108 recusa 31 de setembro, que não existe no calendário', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.recebeAtividade(
      {
        obraId: OBRA_B02,
        data: '2026-09-31',
        descricao: 'Compactação',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
    expect(repositorio.atividades.linhas).toHaveLength(0);
  });

  it('CT-109 recusa 29 de fevereiro de 2026, que não é bissexto', async () => {
    const { casos, portas } = monta();

    const r = await casos.recebeAtividade(
      {
        obraId: OBRA_B02,
        data: '2026-02-29',
        descricao: 'Compactação',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
  });

  it('CT-110 aceita 28 de fevereiro de 2026, último dia do mês de 28', async () => {
    const { casos, portas } = monta();

    const r = await casos.recebeAtividade(
      {
        obraId: OBRA_B02,
        data: '2026-02-28',
        descricao: 'Compactação',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
  });

  it('CT-111 aceita 30 de setembro, último dia do mês de 30', async () => {
    const { casos, portas } = monta(
      { dataTermino: '2027-02-05' },
      relogioFixo('2026-10-10T12:00:00.000Z'),
    );

    const r = await casos.recebeAtividade(
      {
        obraId: OBRA_B02,
        data: '2026-09-30',
        descricao: 'Compactação',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
  });

  it('CT-112 recusa data anterior ao início da obra', async () => {
    const { casos, portas } = monta();

    const r = await casos.recebeAtividade(
      {
        obraId: OBRA_B02,
        data: '2026-02-04',
        descricao: 'Compactação',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DATA_FORA_DO_PERIODO_DA_OBRA);
    expect(!r.ok && r.erro.mensagem.toLowerCase()).toContain('período da obra');
  });

  it('CT-113 aceita a data igual ao início da obra, que é o RDO 0', async () => {
    const { casos, portas } = monta();

    const r = await casos.recebeAtividade(
      {
        obraId: OBRA_B02,
        data: '2026-02-05',
        descricao: 'Mobilização',
        status: { tipo: 'id', id: portas.idDoStatus('Mobilização') },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
  });

  it('CT-114 recusa data posterior ao término da obra', async () => {
    const { casos, portas } = monta({
      dataInicio: '2024-02-05',
      dataTermino: '2025-02-05',
    });

    const r = await casos.recebeAtividade(
      {
        obraId: OBRA_B02,
        data: '2025-02-06',
        descricao: 'Compactação',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DATA_FORA_DO_PERIODO_DA_OBRA);
  });

  it('CT-115 aceita a data igual ao término da obra', async () => {
    const { casos, portas } = monta({
      dataInicio: '2024-02-05',
      dataTermino: '2025-02-05',
    });

    const r = await casos.recebeAtividade(
      {
        obraId: OBRA_B02,
        data: '2025-02-05',
        descricao: 'Desmobilização',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
  });

  it('CT-116 recusa dia que ainda não aconteceu', async () => {
    const { casos, portas } = monta();

    const r = await casos.recebeAtividade(
      {
        obraId: OBRA_B02,
        data: '2026-09-17',
        descricao: 'Compactação',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DATA_FUTURA);
  });

  it('CT-117 aceita hoje pelo fuso da obra, mesmo com o relógio já em outro dia em UTC', async () => {
    // 17/09 02:00 em UTC ainda é 16/09 23:00 em São Paulo.
    const { casos, portas } = monta({}, relogioFixo('2026-09-17T02:00:00.000Z'));

    const r = await casos.recebeAtividade(
      {
        obraId: OBRA_B02,
        data: '2026-09-16',
        descricao: 'Compactação',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
  });

  it('CT-118 mantém os dois lançamentos quando dois autores lançam no mesmo dia', async () => {
    const { casos, portas, repositorio } = monta({}, relogioQueAvanca(HOJE));
    await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Visita do fiscal',
        status: { tipo: 'id', id: portas.idDoStatus('Informativo') },
        chaveDeRascunho: null,
      },
      { usuarioId: E1 },
    );

    await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Fresagem',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    expect(lista.ok && lista.valor).toHaveLength(2);
    expect(repositorio.atividades.linhas.map((l) => l.autorId)).toEqual([E1, C1]);
  });

  it('CT-119 recusa no servidor o lançamento em obra a que o autor não tem acesso', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.lancaAtividade(
      {
        obraId: OBRA_OUTRA,
        data: dia('2026-09-03'),
        descricao: 'Fresagem',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(repositorio.atividades.linhas).toHaveLength(0);
  });

  it('CT-120 mantém a ordem de registro das atividades do dia', async () => {
    const { casos, portas } = monta({}, relogioQueAvanca(HOJE));
    for (const descricao of ['Primeira', 'Segunda', 'Terceira']) {
      await casos.lancaAtividade(
        {
          obraId: OBRA_B02,
          data: dia('2026-09-03'),
          descricao,
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
          chaveDeRascunho: null,
        },
        { usuarioId: C1 },
      );
    }

    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));

    expect(lista.ok && lista.valor.map((a) => a.descricao)).toEqual([
      'Primeira',
      'Segunda',
      'Terceira',
    ]);
  });

  it('o termo do status acompanha a atividade com a grafia oficial do cadastro', async () => {
    const { casos } = monta();
    await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Fresagem',
        status: { tipo: 'termo', termo: ' perca de Produção ' },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));

    expect(lista.ok && lista.valor[0]?.statusTermo).toBe('Perca de produção');
  });
});
