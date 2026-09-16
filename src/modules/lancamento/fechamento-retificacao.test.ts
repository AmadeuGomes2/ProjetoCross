/**
 * Casos CT-146 a CT-160 — F4.6, corrigir em dia aberto, fechar e retificar.
 *
 * Expectativas: `docs/prd/v1.md`, Funcionalidade 4.6; decisões 6.2, 9.1 e 22.1;
 * `CLAUDE.md`, seção Modelo ("Lançamento é imutável no dia fechado").
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
  E2,
  OBRA_B02,
  OBRA_OUTRA,
  quantidade,
  relogioQueAvanca,
} from './teste/duplas';

const HOJE = '2026-09-16T12:00:00.000Z';

function monta(configuracao: Partial<ConfiguracaoDasPortas> = {}) {
  const repositorio = criaRepositorioEmMemoria();
  const portas = criaPortasDeTeste(configuracao);
  const casos = criaCasosDeLancamento({
    repositorio,
    portas,
    relogio: relogioQueAvanca(HOJE),
  });
  return { repositorio, portas, casos };
}

async function lancaFresagem(
  casos: ReturnType<typeof criaCasosDeLancamento>,
  portas: ReturnType<typeof criaPortasDeTeste>,
  autor = C1,
) {
  const r = await casos.lancaAtividade(
    {
      obraId: OBRA_B02,
      data: dia('2026-09-03'),
      descricao: 'Fresagem da Rua A',
      status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      chaveDeRascunho: null,
    },
    { usuarioId: autor },
  );
  if (!r.ok) throw new Error(`Preparação do teste falhou: ${r.erro.codigo}`);
  return r.valor.id;
}

describe('F4.6 corrigir, fechar e retificar', () => {
  it('CT-146 corrige em dia aberto e guarda quem corrigiu e quando', async () => {
    const { casos, portas, repositorio } = monta();
    const id = await lancaFresagem(casos, portas);

    const r = await casos.corrigeLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Fresagem da Rua A, estacas 10 a 14',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    expect(lista.ok && lista.valor[0]?.descricao).toBe(
      'Fresagem da Rua A, estacas 10 a 14',
    );
    const linha = repositorio.atividades.linhas[0];
    expect(linha?.atualizadoPor).toBe(C1);
    expect(linha?.atualizadoEm).not.toBeNull();
    // Correção em dia aberto substitui: não cria segunda linha.
    expect(repositorio.atividades.linhas).toHaveLength(1);
  });

  it('CT-147 exclui em dia aberto e o dia fica com zero atividades', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas);

    const r = await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade' },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    expect(lista.ok && lista.valor).toHaveLength(0);
  });

  it('CT-148 o engenheiro fecha o dia e o número do RDO congela em 210', async () => {
    const { casos, portas, repositorio } = monta();
    await lancaFresagem(casos, portas);

    const r = await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    expect(r.ok && r.valor).toBe(210);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-03'));
    expect(diaDeObra?.fechadoPor).toBe(E1);
    expect(diaDeObra?.fechadoEm).not.toBeNull();
    expect(diaDeObra?.numeroRdoCongelado).toBe(210);
  });

  it('CT-149 recusa no servidor o pedido do encarregado de fechar o dia', async () => {
    const { casos, portas, repositorio } = monta();
    await lancaFresagem(casos, portas);

    const r = await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-03'));
    expect(diaDeObra?.fechadoEm).toBeNull();
    expect(diaDeObra?.numeroRdoCongelado).toBeNull();
  });

  it('CT-150 ler o dia não fecha o dia: nenhuma consulta escreve fechamento', async () => {
    const { casos, portas, repositorio } = monta();
    await lancaFresagem(casos, portas);

    await casos.obtemDiaDeObra(OBRA_B02, dia('2026-09-03'));
    await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    await casos.somaProducaoAte(OBRA_B02, dia('2026-09-03'));
    await casos.obtemPluviometriaVigente(OBRA_B02, dia('2026-09-03'));

    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-03'));
    expect(diaDeObra?.fechadoEm).toBeNull();
  });

  it('CT-151 recusa correção direta em dia fechado e manda retificar', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas);
    await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );

    const r = await casos.corrigeLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Fresagem da Rua A, estacas 10 a 14',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DIA_FECHADO);
    expect(!r.ok && r.erro.mensagem.toLowerCase()).toContain('fechado');
    expect(!r.ok && r.erro.mensagem.toLowerCase()).toContain('retifica');
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    expect(lista.ok && lista.valor[0]?.descricao).toBe('Fresagem da Rua A');
  });

  it('CT-152 a retificação aponta para o original e as duas versões ficam no histórico', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas);
    await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );

    const r = await casos.retificaLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Fresagem da Rua A, estacas 10 a 14',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    expect(lista.ok && lista.valor).toHaveLength(1);
    expect(lista.ok && lista.valor[0]?.descricao).toBe(
      'Fresagem da Rua A, estacas 10 a 14',
    );
    const historico = await casos.listaHistoricoDoLancamento(OBRA_B02, 'atividade', id);
    expect(historico.ok && historico.valor).toHaveLength(2);
    expect(historico.ok && historico.valor[0]?.vigente).toBe(false);
    expect(historico.ok && historico.valor[0]?.autorId).toBe(C1);
    expect(historico.ok && historico.valor[1]?.vigente).toBe(true);
    expect(historico.ok && historico.valor[1]?.retificaId).toBe(id);
    expect(historico.ok && historico.valor[1]?.autorId).toBe(E1);
  });

  it('CT-153 retificar não renumera o documento', async () => {
    const { casos, portas, repositorio } = monta();
    const id = await lancaFresagem(casos, portas);
    await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );

    await casos.retificaLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Fresagem da Rua A, estacas 10 a 14',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: E1 },
    );

    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-03'));
    expect(diaDeObra?.numeroRdoCongelado).toBe(210);
  });

  it('CT-154 recusa a retificação do encarregado, mesmo sendo ele o autor', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas, C1);
    await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );

    const r = await casos.retificaLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Fresagem da Rua A, estacas 10 a 14',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    expect(lista.ok && lista.valor[0]?.descricao).toBe('Fresagem da Rua A');
  });

  it('CT-155 o engenheiro retifica lançamento feito pelo encarregado', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas, C1);
    await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );

    const r = await casos.retificaLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Fresagem da Rua A - bordo direito',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    expect(lista.ok && lista.valor[0]?.descricao).toBe(
      'Fresagem da Rua A - bordo direito',
    );
    const historico = await casos.listaHistoricoDoLancamento(OBRA_B02, 'atividade', id);
    expect(historico.ok && historico.valor).toHaveLength(2);
  });

  it('CT-156 o engenheiro retifica o próprio lançamento', async () => {
    const { casos, portas } = monta();
    const producao = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        servico: { tipo: 'id', id: portas.idDoServico('IM.(SUBLEITO+BASE+CAPA)') },
        quantidade: '1884,00',
      },
      { usuarioId: E1 },
    );
    if (!producao.ok) throw new Error('Preparação do teste falhou');
    await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );

    const r = await casos.retificaLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: producao.valor.id,
        conteudo: {
          tipo: 'producao',
          servico: { tipo: 'id', id: portas.idDoServico('IM.(SUBLEITO+BASE+CAPA)') },
          quantidade: quantidade('1900,00'),
        },
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    const historico = await casos.listaHistoricoDoLancamento(
      OBRA_B02,
      'producao',
      producao.valor.id,
    );
    expect(historico.ok && historico.valor).toHaveLength(2);
    expect(historico.ok && historico.valor[1]?.retificaId).toBe(producao.valor.id);
    expect(historico.ok && historico.valor[1]?.autorId).toBe(E1);
  });

  it('CT-157 o acumulado usa a versão vigente, não a retificada', async () => {
    const { casos, portas } = monta();
    const servicoId = portas.idDoServico('IM.(SUBLEITO+BASE+CAPA)');
    const producao = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        servico: { tipo: 'id', id: servicoId },
        quantidade: '1884,00',
      },
      { usuarioId: E1 },
    );
    if (!producao.ok) throw new Error('Preparação do teste falhou');
    await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );
    await casos.retificaLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: producao.valor.id,
        conteudo: {
          tipo: 'producao',
          servico: { tipo: 'id', id: servicoId },
          quantidade: quantidade('1900,00'),
        },
      },
      { usuarioId: E1 },
    );

    const acumulado = await casos.somaProducaoAte(OBRA_B02, dia('2026-09-03'));

    const linha = acumulado.ok
      ? acumulado.valor.find((p) => p.servicoId === servicoId)
      : undefined;
    expect(linha?.quantidade.toString()).toBe('1900');
  });

  it('CT-158 o número congelado não muda quando a data de início da obra muda', async () => {
    const { casos, portas, repositorio } = monta();
    await lancaFresagem(casos, portas);
    await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );

    // A obra passa a começar em 06/02/2026. O módulo `obra` é de outra frente;
    // aqui a mudança é o que o módulo vê: um período novo nas portas.
    const casosDepois = criaCasosDeLancamento({
      repositorio,
      portas: criaPortasDeTeste({ dataInicio: '2026-02-06' }),
      relogio: relogioQueAvanca(HOJE),
    });
    const diaDeObra = await casosDepois.obtemDiaDeObra(OBRA_B02, dia('2026-09-03'));

    expect(diaDeObra.ok && diaDeObra.valor?.numeroRdoCongelado).toBe(210);
  });

  it('CT-159 o dia ainda aberto é numerado pela data de início vigente', async () => {
    const { casos, portas, repositorio } = monta({ dataInicio: '2026-02-06' });
    await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-04'),
        descricao: 'Compactação',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    const r = await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-04') },
      { usuarioId: E1 },
    );

    // 04/09/2026 menos 06/02/2026 são 210 dias corridos.
    expect(r.ok && r.valor).toBe(210);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-04'));
    expect(diaDeObra?.numeroRdoCongelado).toBe(210);
  });

  it('CT-160 recusa correção de lançamento de outra obra, porque o id não é chave de acesso', async () => {
    const { casos, portas } = monta();
    const daOutra = await casos.lancaAtividade(
      {
        obraId: OBRA_OUTRA,
        data: dia('2026-09-03'),
        descricao: 'Serviço da outra obra',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: E2 },
    );
    if (!daOutra.ok) throw new Error('Preparação do teste falhou');

    const comObraCerta = await casos.corrigeLancamento(
      {
        obraId: OBRA_OUTRA,
        lancamentoId: daOutra.valor.id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Mexido por quem não devia',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: C1 },
    );
    const comObraPropria = await casos.corrigeLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: daOutra.valor.id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Mexido por quem não devia',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: C1 },
    );

    expect(comObraCerta.ok).toBe(false);
    expect(comObraPropria.ok).toBe(false);
    expect(!comObraPropria.ok && comObraPropria.erro.codigo).toBe(
      CODIGO_ERRO.NAO_ENCONTRADO,
    );
  });

  it('o dia sem lançamento nenhum não é fechado', async () => {
    const { casos } = monta();

    const r = await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-07') },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.NAO_ENCONTRADO);
  });

  it('o dia já fechado não fecha de novo, para o número não ser reescrito', async () => {
    const { casos, portas } = monta();
    await lancaFresagem(casos, portas);
    await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );

    const r = await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DIA_FECHADO);
  });

  it('não se lança atividade nova em dia fechado', async () => {
    const { casos, portas } = monta();
    await lancaFresagem(casos, portas);
    await casos.fechaDia(
      { obraId: OBRA_B02, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );

    const r = await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-03'),
        descricao: 'Chegou depois',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DIA_FECHADO);
  });
});
