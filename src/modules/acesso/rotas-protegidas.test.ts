/**
 * Verificação 4 de docs/arquitetura/v1.md, seção 9, corrigida:
 *
 *   "Todo manipulador em `src/app/**` que receba `obraId` passa pela
 *    verificação de acesso."
 *
 * A versão anterior varria **só** `src/app/**\/route.ts`. Não existia nenhum
 * arquivo com esse nome no repositório, então a asserção era `[] === []` e
 * passava verde enquanto 18 páginas ficavam sem verificação. Foi esse teste que
 * deixou os dois críticos de segurança do laudo de 16/09/2026 atravessarem a
 * entrega. Ver `docs/seguranca/2026-09-16-fatia-vertical-v1.md`, ATENÇÃO 1.
 *
 * Agora a varredura cobre a **superfície real de servidor**: `page.tsx`,
 * `route.ts` e todo arquivo marcado com `'use server'`. Um teste que varre
 * precisa provar que varreu: por isso a primeira asserção é sobre o **tamanho**
 * do que foi encontrado, e não sobre o que faltou.
 *
 * A seção 5.2 diz por que isto é teste e não inspeção: **inspeção manual é a
 * que falha na sexta rota nova.**
 *
 * Este teste lê o sistema de arquivos, o que os testes unitários não fazem
 * (padroes-codigo, Testes). É deliberado: o que está sob verificação é a
 * **forma do repositório**, não um cálculo. Não há rede nem relógio.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraAcesso } from '../../app/_composicao/ambiente-de-cadastro';
import {
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import { acesso as tabelaDeAcesso } from '../../db/schema';
import { comAtorNaObra } from './autorizacao';
import type { Ambiente, Ator } from './tipos';
import { CODIGO_ERRO, erro, erroDeAcesso, ok, type Result } from '../../shared/result';
import type { ErroDeAcesso } from '../../shared/result';
import { idConfiavel } from '../../shared/id';

const PASTA_APP = fileURLToPath(new URL('../../app', import.meta.url));

/** `'use server'` na primeira linha útil do arquivo. É o que marca a ação. */
const MARCA_DE_SERVER_ACTION = /^\s*['"]use server['"]/m;

/**
 * As três marcas que provam que o arquivo passou pela fronteira de confiança:
 *
 * - `comAtorNaObra` é o embrulho obrigatório dos manipuladores de rota (5.2);
 * - `exigeAcessoNaObra` é a verificação direta, usada pelas páginas;
 * - o sufixo `Protegid` nomeia as funções de `src/app/_composicao/` que
 *   começam por `exigeAcessoNaObra` antes de qualquer caso de uso. O nome é o
 *   contrato: função que se chama assim e não autoriza é defeito de quem a
 *   escreveu, e este teste não tem como saber disso — por isso a convenção de
 *   nome é parte da regra, não um atalho dela.
 */
const MARCAS_DE_VERIFICACAO = ['comAtorNaObra', 'exigeAcessoNaObra', 'Protegid'] as const;

interface ArquivoDeServidor {
  readonly caminho: string;
  readonly especie: 'page' | 'route' | 'use server';
  readonly conteudo: string;
}

function ehPaginaOuRota(nome: string): 'page' | 'route' | null {
  if (nome === 'page.tsx' || nome === 'page.ts') return 'page';
  if (nome === 'route.ts' || nome === 'route.tsx') return 'route';
  return null;
}

function superficieDeServidor(pasta: string): ArquivoDeServidor[] {
  const achados: ArquivoDeServidor[] = [];
  for (const entrada of readdirSync(pasta)) {
    const caminho = join(pasta, entrada);
    if (statSync(caminho).isDirectory()) {
      achados.push(...superficieDeServidor(caminho));
      continue;
    }
    if (!entrada.endsWith('.ts') && !entrada.endsWith('.tsx')) continue;
    if (entrada.endsWith('.test.ts') || entrada.endsWith('.test.tsx')) continue;

    const conteudo = readFileSync(caminho, 'utf8');
    const especie = ehPaginaOuRota(entrada);
    if (especie !== null) {
      achados.push({ caminho, especie, conteudo });
      continue;
    }
    if (MARCA_DE_SERVER_ACTION.test(conteudo)) {
      achados.push({ caminho, especie: 'use server', conteudo });
    }
  }
  return achados;
}

/**
 * O arquivo recebe uma obra?
 *
 * Duas formas: o segmento `[obraId]` no caminho, que é a URL adivinhável, e a
 * menção a `obraId` no corpo, que é o campo escondido do formulário. As duas
 * carregam a mesma coisa e as duas precisam da mesma verificação.
 */
export function recebeObra(caminho: string, conteudo: string): boolean {
  return caminho.includes(`[obraId]`) || /\bobraId\b/.test(conteudo);
}

export function passaPelaVerificacao(conteudo: string): boolean {
  return MARCAS_DE_VERIFICACAO.some((marca) => conteudo.includes(marca));
}

function relativo(caminho: string): string {
  return caminho
    .slice(PASTA_APP.length + 1)
    .split(sep)
    .join('/');
}

describe('fronteira de confiança da superfície de servidor', () => {
  const superficie = superficieDeServidor(PASTA_APP);

  it('varre a superfície real, e não uma pasta vazia', () => {
    // A asserção que faltava. Sem ela, um `include` errado transforma o teste
    // inteiro em `[] === []` — que foi exatamente o que aconteceu.
    expect(superficie.length).toBeGreaterThan(10);
    expect(superficie.some((a) => a.especie === 'page')).toBe(true);
    expect(superficie.some((a) => a.especie === 'route')).toBe(true);
    expect(superficie.some((a) => a.especie === 'use server')).toBe(true);
  });

  it('nenhuma página, rota ou ação que receba obraId fica sem verificação', () => {
    const semVerificacao = superficie
      .filter((a) => recebeObra(a.caminho, a.conteudo))
      .filter((a) => !passaPelaVerificacao(a.conteudo))
      .map((a) => relativo(a.caminho));

    expect(semVerificacao).toEqual([]);
  });

  it('acusa uma página nova que receba obraId sem verificar o acesso', () => {
    // A prova de que a regra morde. Se esta asserção falhar, a anterior passa
    // a não significar nada — é a mesma armadilha de antes, com outro nome.
    const paginaNova = [
      'export default async function Nova({ params }: { params: Promise<{ obraId: string }> }) {',
      '  const { obraId } = await params;',
      '  return <main>{obraId}</main>;',
      '}',
    ].join('\n');

    expect(recebeObra('src/app/(x)/x/[obraId]/page.tsx', paginaNova)).toBe(true);
    expect(passaPelaVerificacao(paginaNova)).toBe(false);
  });
});

describe('comAtorNaObra', () => {
  let cenario: Cenario;
  let amb: Ambiente;
  let atorFalso: Ator;

  beforeEach(async () => {
    cenario = await montaCenario();
    amb = paraAcesso(cenario.amb);
    atorFalso = await cenario.novoEngenheiro('e1@exemplo.invalido');
  });

  afterEach(async () => {
    await cenario.fecha();
  });

  /**
   * A porta de autenticação passou a ser assíncrona junto com o banco: quem
   * responde quem é o portador lê a tabela `sessao`, e ler virou `await`.
   */
  function dependencias(autentica: () => Promise<Result<Ator, ErroDeAcesso>>) {
    return { autentica, amb: () => amb };
  }

  it('responde 401 quando nao ha sessao valida', async () => {
    const manipulador = comAtorNaObra(
      'encarregado',
      async () => Response.json({ ok: true }),
      dependencias(async () =>
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
      dependencias(async () => ok(atorFalso)),
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
      dependencias(async () => ok(atorFalso)),
    );

    const resposta = await manipulador(new Request('https://exemplo.invalido/'), {
      params: Promise.resolve({ obraId: 'obra-que-nao-e-dele' }),
    });

    expect(resposta.status).toBe(403);
    expect(chamou).toBe(false);
  });

  it('chama o manipulador com o AtorNaObra quando o acesso existe', async () => {
    const obraId = await criaObraDoPrd(atorFalso, cenario.amb);
    let perfilRecebido: string | null = null;

    const manipulador = comAtorNaObra(
      'engenheiro',
      async (ator) => {
        perfilRecebido = ator.perfil;
        return Response.json({ ok: true });
      },
      dependencias(async () => ok(atorFalso)),
    );

    const resposta = await manipulador(new Request('https://exemplo.invalido/'), {
      params: Promise.resolve({ obraId }),
    });

    expect(resposta.status).toBe(200);
    expect(perfilRecebido).toBe('engenheiro');
  });

  it('entrega ao manipulador os demais parâmetros da rota', async () => {
    // O dia do RDO vem do caminho, como o `obraId`. Sem isto o manipulador
    // precisaria remontar a URL na mão, que é onde se erra o segmento.
    const obraId = await criaObraDoPrd(atorFalso, cenario.amb);
    let diaRecebido: unknown = null;

    const manipulador = comAtorNaObra(
      'engenheiro',
      async (_ator, _requisicao, params) => {
        diaRecebido = params['dia'];
        return Response.json({ ok: true });
      },
      dependencias(async () => ok(atorFalso)),
    );

    await manipulador(new Request('https://exemplo.invalido/'), {
      params: Promise.resolve({ obraId, dia: '2026-09-03' }),
    });

    expect(diaRecebido).toBe('2026-09-03');
  });

  it('responde 403 ao encarregado numa rota que exige engenheiro', async () => {
    const obraId = await criaObraDoPrd(atorFalso, cenario.amb);
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    // Acesso de encarregado gravado direto na tabela: o que está sob teste é o
    // embrulho de rota, não o caminho pelo qual o acesso nasceu.
    await cenario.conexao.db.insert(tabelaDeAcesso).values({
      id: idConfiavel<'acesso'>('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      obraId,
      usuarioId: c1.usuarioId,
      perfil: 'encarregado',
      liberadoPor: atorFalso.usuarioId,
      liberadoEm: '2026-09-16T12:00:00.000Z',
    });

    const manipulador = comAtorNaObra(
      'engenheiro',
      async () => Response.json({ ok: true }),
      dependencias(async () => ok(c1)),
    );

    const resposta = await manipulador(new Request('https://exemplo.invalido/'), {
      params: Promise.resolve({ obraId }),
    });

    expect(resposta.status).toBe(403);
  });
});
