/**
 * Casos CT-121 a CT-132 — F4.3, lançar produção por serviço controlado.
 *
 * Expectativas: `docs/prd/v1.md`, Funcionalidade 4.3; decisões 12.1 e 13.3;
 * casos obrigatórios 5, 6, 11 e 14; `regras-extraidas.md` seção 2.
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
  OBRA_B02,
  quantidade,
  relogioFixo,
  relogioQueAvanca,
} from './teste/duplas';

const HOJE = '2026-09-16T12:00:00.000Z';
const SERVICO = 'REC.(FRESA+CAPA)';

function monta(
  configuracao: Partial<ConfiguracaoDasPortas> = {},
  relogio: () => Date = relogioFixo(HOJE),
) {
  const repositorio = criaRepositorioEmMemoria();
  const portas = criaPortasDeTeste(configuracao);
  const casos = criaCasosDeLancamento({ repositorio, portas, relogio });
  return { repositorio, portas, casos };
}

describe('F4.3 lançar produção', () => {
  it('CT-121 grava a quantidade com as três casas exatas, com autor e hora', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '234,500',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const linha = repositorio.producao.linhas[0];
    expect(linha?.quantidade.toString()).toBe('234.5');
    expect(linha?.data).toBe('2026-09-03');
    expect(linha?.servicoId).toBe(portas.idDoServico(SERVICO));
    expect(linha?.autorId).toBe(C1);
    expect(linha?.registradoEm).toBe(HOJE);
  });

  it('CT-122 recusa produção negativa', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '-5',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(repositorio.producao.linhas).toHaveLength(0);
  });

  it('CT-123 recusa produção zero, porque ausência de produção é ausência de lançamento', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '0',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.QUANTIDADE_NAO_POSITIVA);
    expect(repositorio.producao.linhas).toHaveLength(0);
  });

  it('CT-124 aceita 0,001 sem arredondar', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '0,001',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    expect(repositorio.producao.linhas[0]?.quantidade.toString()).toBe('0.001');
  });

  it('CT-124b recusa mais de três casas em vez de arredondar em silêncio', async () => {
    const { casos, portas } = monta();

    const r = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '1,2345',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.QUANTIDADE_CASAS_DEMAIS);
  });

  it('CT-125 recusa serviço com espaço interno divergente e não cria serviço novo', async () => {
    const { casos, portas, repositorio } = monta();
    const antes = portas.contaServicos();

    const r = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        servico: { tipo: 'nome', nome: 'REC. (FRESA+CAPA)' },
        quantidade: '100',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.NAO_ENCONTRADO);
    expect(repositorio.producao.linhas).toHaveLength(0);
    expect(portas.contaServicos()).toBe(antes);
  });

  it('CT-126 aceita produção em dia sem atividade nenhuma, com aviso', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-03-27',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '2992',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    expect(r.ok && r.valor.avisos.map((a) => a.codigo)).toContain(
      'PRODUCAO_SEM_ATIVIDADE',
    );
    expect(repositorio.producao.linhas).toHaveLength(1);
  });

  it('CT-127 aceita produção em dia parado, com aviso, sem mudar o estado do dia', async () => {
    const { casos, portas, repositorio } = monta();
    await casos.declaraEstadoDoDia(
      {
        obraId: OBRA_B02,
        data: dia('2026-09-06'),
        estado: 'parado',
        motivoParada: 'Domingo',
      },
      { usuarioId: C1 },
    );

    const r = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-06',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '100',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    expect(r.ok && r.valor.avisos.map((a) => a.codigo)).toContain(
      'PRODUCAO_EM_DIA_PARADO',
    );
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia('2026-09-06'));
    expect(diaDeObra?.estado).toBe('parado');
    expect(diaDeObra?.motivoParada).toBe('Domingo');
  });

  it('CT-128 avisa quando o acumulado passa da quantidade de projeto, sem bloquear', async () => {
    const { casos, portas } = monta({}, relogioQueAvanca(HOJE));
    await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-02',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '2000',
      },
      { usuarioId: C1 },
    );

    const r = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '300',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const aviso = r.ok
      ? r.valor.avisos.find((a) => a.codigo === 'ACUMULADO_ACIMA_DO_PROJETO')
      : undefined;
    expect(aviso).toBeDefined();
    expect(aviso?.mensagem).toContain('2.300,000');
    expect(aviso?.mensagem).toContain('2.210,392');
  });

  it('CT-129 não avisa quando o acumulado fica exatamente igual ao projeto', async () => {
    const { casos, portas } = monta({}, relogioQueAvanca(HOJE));
    await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-02',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '2000',
      },
      { usuarioId: C1 },
    );

    const r = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '210,392',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    expect(r.ok && r.valor.avisos.map((a) => a.codigo)).not.toContain(
      'ACUMULADO_ACIMA_DO_PROJETO',
    );
    const acumulado = await casos.somaProducaoAte(OBRA_B02, dia('2026-09-03'));
    const linha = acumulado.ok
      ? acumulado.valor.find((p) => p.servicoId === portas.idDoServico(SERVICO))
      : undefined;
    expect(linha?.quantidade.toString()).toBe('2210.392');
  });

  it('CT-130 recusa produção sem data', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '100',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(repositorio.producao.linhas).toHaveLength(0);
  });

  it('CT-131 recusa produção para dia futuro', async () => {
    const { casos, portas } = monta();

    const r = await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-17',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '100',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DATA_FUTURA);
  });

  it('CT-132 soma os lançamentos do dia de autores diferentes, sem sobrescrever', async () => {
    const { casos, portas, repositorio } = monta({}, relogioQueAvanca(HOJE));
    await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '100,000',
      },
      { usuarioId: C1 },
    );
    await casos.recebeProducao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
        quantidade: '50,000',
      },
      { usuarioId: E1 },
    );

    const doDia = await casos.somaProducaoDoDia(OBRA_B02, dia('2026-09-03'));

    const linha = doDia.ok
      ? doDia.valor.find((p) => p.servicoId === portas.idDoServico(SERVICO))
      : undefined;
    expect(linha?.quantidade.toString()).toBe('150');
    expect(repositorio.producao.linhas).toHaveLength(2);
    expect(repositorio.producao.linhas.map((l) => l.autorId)).toEqual([C1, E1]);
  });

  it('o acumulado soma os dias anteriores e o próprio dia, e ignora os posteriores', async () => {
    const { casos, portas } = monta({}, relogioQueAvanca(HOJE));
    for (const [data, valor] of [
      ['2026-09-01', '10,001'],
      ['2026-09-02', '0,002'],
      ['2026-09-03', '0,003'],
      ['2026-09-04', '99'],
    ] as const) {
      await casos.recebeProducao(
        {
          obraId: OBRA_B02,
          data,
          servico: { tipo: 'id', id: portas.idDoServico(SERVICO) },
          quantidade: valor,
        },
        { usuarioId: C1 },
      );
    }

    const acumulado = await casos.somaProducaoAte(OBRA_B02, dia('2026-09-03'));

    const linha = acumulado.ok
      ? acumulado.valor.find((p) => p.servicoId === portas.idDoServico(SERVICO))
      : undefined;
    // 10,001 + 0,002 + 0,003 = 10,006 exatos. Com ponto flutuante binário a
    // soma daria 10,005999999999999 e o acumulado divergiria da planilha.
    expect(linha?.quantidade.equals(quantidade('10,006'))).toBe(true);
  });
});
