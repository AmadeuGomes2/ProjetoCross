/**
 * Casos CT-142 a CT-145 — F4.5, lançar observação.
 *
 * Expectativas: `docs/prd/v1.md`, Funcionalidade 4.5; decisões 10.1 e 17.1;
 * `regras-extraidas.md` seção 8.
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

const HOJE = '2026-09-16T12:00:00.000Z';

function monta() {
  const repositorio = criaRepositorioEmMemoria();
  const portas = criaPortasDeTeste();
  const casos = criaCasosDeLancamento({
    repositorio,
    portas,
    relogio: relogioFixo(HOJE),
  });
  return { repositorio, portas, casos };
}

describe('F4.5 lançar observação', () => {
  it('CT-142 grava a observação da contratada com data, lado, autor e hora', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebeObservacao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        lado: 'CROS',
        texto: 'Frente da Rua A liberada pela fiscalização às 9h',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const linha = repositorio.observacoes.linhas[0];
    expect(linha?.data).toBe('2026-09-03');
    expect(linha?.lado).toBe('CROS');
    expect(linha?.texto).toBe('Frente da Rua A liberada pela fiscalização às 9h');
    expect(linha?.autorId).toBe(C1);
    expect(linha?.registradoEm).toBe(HOJE);
  });

  it('CT-143 recusa observação com texto vazio', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebeObservacao(
      { obraId: OBRA_B02, data: '2026-09-03', lado: 'CROS', texto: '' },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.TERMO_VAZIO);
    expect(repositorio.observacoes.linhas).toHaveLength(0);
  });

  it('CT-144 recusa observação só com espaços, porque as pontas são recortadas antes', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebeObservacao(
      { obraId: OBRA_B02, data: '2026-09-03', lado: 'CROS', texto: '    ' },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.TERMO_VAZIO);
    expect(repositorio.observacoes.linhas).toHaveLength(0);
  });

  it('CT-145 recusa o lado CONTRATANTE na v1, dizendo que o bloco sai vazio', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.recebeObservacao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        lado: 'CONTRATANTE',
        texto: 'Fiscal solicitou reforço de sinalização',
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.mensagem).toContain('COMENTÁRIO CONTRATANTE');
    expect(repositorio.observacoes.linhas).toHaveLength(0);
  });

  it('a observação sai da leitura do lado CROS, e o lado CONTRATANTE sai sempre vazio', async () => {
    const { casos } = monta();
    await casos.recebeObservacao(
      { obraId: OBRA_B02, data: '2026-09-03', lado: 'CROS', texto: 'Frente liberada' },
      { usuarioId: C1 },
    );

    const cros = await casos.listaObservacoesVigentes(
      OBRA_B02,
      dia('2026-09-03'),
      'CROS',
    );
    const contratante = await casos.listaObservacoesVigentes(
      OBRA_B02,
      dia('2026-09-03'),
      'CONTRATANTE',
    );

    expect(cros.ok && cros.valor.map((o) => o.texto)).toEqual(['Frente liberada']);
    expect(contratante.ok && contratante.valor).toHaveLength(0);
  });

  it('o texto guardado preserva os espaços do meio e recorta só as pontas', async () => {
    const { casos, repositorio } = monta();

    await casos.recebeObservacao(
      {
        obraId: OBRA_B02,
        data: '2026-09-03',
        lado: 'CROS',
        texto: '  Frente da Rua A  liberada  ',
      },
      { usuarioId: C1 },
    );

    expect(repositorio.observacoes.linhas[0]?.texto).toBe('Frente da Rua A  liberada');
  });
});
