/**
 * Verificação 4 de docs/arquitetura/v1.md, seção 9:
 *
 *   "Todo manipulador em `src/app/**` + `/route.ts` passa por `comAtorNaObra`."
 *
 * A seção 5.2 diz por que isto é teste e não inspeção: **inspeção manual é a
 * que falha na sexta rota nova.** Quem acrescentar um manipulador de rota sem o
 * embrulho vai ver este teste ficar vermelho, e não vai depender de alguém
 * lembrar da regra na revisão.
 *
 * Este teste lê o sistema de arquivos, o que os testes unitários não fazem
 * (padroes-codigo, Testes). É deliberado: o que está sob verificação é a
 * **forma do repositório**, não um cálculo. Não há rede nem relógio.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraAcesso } from '../../app/_composicao/ambiente-de-cadastro';
import {
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import { comAtorNaObra } from './autorizacao';
import type { Ambiente, Ator } from './tipos';
import { CODIGO_ERRO, erro, erroDeAcesso, ok, type Result } from '../../shared/result';
import type { ErroDeAcesso } from '../../shared/result';

const PASTA_APP = fileURLToPath(new URL('../../app', import.meta.url));

function manipuladoresDeRota(pasta: string): string[] {
  const achados: string[] = [];
  for (const entrada of readdirSync(pasta)) {
    const caminho = join(pasta, entrada);
    if (statSync(caminho).isDirectory()) {
      achados.push(...manipuladoresDeRota(caminho));
      continue;
    }
    if (entrada === 'route.ts' || entrada === 'route.tsx') achados.push(caminho);
  }
  return achados;
}

describe('fronteira de confiança das rotas', () => {
  it('nenhum route.ts exporta manipulador sem passar por comAtorNaObra', () => {
    const arquivos = manipuladoresDeRota(PASTA_APP);

    const semEmbrulho = arquivos.filter(
      (caminho) => !readFileSync(caminho, 'utf8').includes('comAtorNaObra'),
    );

    expect(semEmbrulho).toEqual([]);
  });
});

describe('comAtorNaObra', () => {
  let cenario: Cenario;
  let amb: Ambiente;
  let atorFalso: Ator;

  beforeEach(() => {
    cenario = montaCenario();
    amb = paraAcesso(cenario.amb);
    atorFalso = cenario.novoAtor('e1@exemplo.invalido');
  });

  afterEach(() => {
    cenario.fecha();
  });

  function dependencias(autentica: () => Result<Ator, ErroDeAcesso>) {
    return { autentica, amb: () => amb };
  }

  it('responde 401 quando nao ha sessao valida', async () => {
    const manipulador = comAtorNaObra(
      'encarregado',
      async () => Response.json({ ok: true }),
      dependencias(() =>
        erro(erroDeAcesso(CODIGO_ERRO.SEM_PERMISSAO, 'Sua sessão terminou.')),
      ),
    );

    const resposta = await manipulador(new Request('https://exemplo.invalido/'), {
      params: Promise.resolve({ obraId: 'qualquer' }),
    });

    expect(resposta.status).toBe(401);
  });

  it('responde 403 quando a rota nao traz obraId', async () => {
    // Sem obra não há o que autorizar; o manipulador protegido nunca corre.
    let chamou = false;
    const manipulador = comAtorNaObra(
      'encarregado',
      async () => {
        chamou = true;
        return Response.json({ ok: true });
      },
      dependencias(() => ok(atorFalso)),
    );

    const resposta = await manipulador(new Request('https://exemplo.invalido/'), {
      params: Promise.resolve({}),
    });

    expect(resposta.status).toBe(403);
    expect(chamou).toBe(false);
  });

  it('responde 403 quando o ator nao tem acesso aquela obra', async () => {
    let chamou = false;
    const manipulador = comAtorNaObra(
      'encarregado',
      async () => {
        chamou = true;
        return Response.json({ ok: true });
      },
      dependencias(() => ok(atorFalso)),
    );

    const resposta = await manipulador(new Request('https://exemplo.invalido/'), {
      params: Promise.resolve({ obraId: 'obra-que-nao-e-dele' }),
    });

    expect(resposta.status).toBe(403);
    expect(chamou).toBe(false);
  });

  it('chama o manipulador com o AtorNaObra quando o acesso existe', async () => {
    const obraId = criaObraDoPrd(atorFalso, cenario.amb);
    let perfilRecebido: string | null = null;

    const manipulador = comAtorNaObra(
      'engenheiro',
      async (ator) => {
        perfilRecebido = ator.perfil;
        return Response.json({ ok: true });
      },
      dependencias(() => ok(atorFalso)),
    );

    const resposta = await manipulador(new Request('https://exemplo.invalido/'), {
      params: Promise.resolve({ obraId }),
    });

    expect(resposta.status).toBe(200);
    expect(perfilRecebido).toBe('engenheiro');
  });

  it('responde 403 ao encarregado numa rota que exige engenheiro', async () => {
    const obraId = criaObraDoPrd(atorFalso, cenario.amb);
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    cenario.conexao.sqlite
      .prepare(
        `INSERT INTO acesso (id, obra_id, usuario_id, perfil, liberado_por, liberado_em)
         VALUES (?, ?, ?, 'encarregado', ?, ?)`,
      )
      .run(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        obraId,
        c1.usuarioId,
        atorFalso.usuarioId,
        '2026-09-16T12:00:00.000Z',
      );

    const manipulador = comAtorNaObra(
      'engenheiro',
      async () => Response.json({ ok: true }),
      dependencias(() => ok(c1)),
    );

    const resposta = await manipulador(new Request('https://exemplo.invalido/'), {
      params: Promise.resolve({ obraId }),
    });

    expect(resposta.status).toBe(403);
  });
});
