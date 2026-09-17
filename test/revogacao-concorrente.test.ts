/**
 * Duas revogações ao mesmo tempo não deixam a obra sem engenheiro.
 *
 * ## Por que este arquivo existe
 *
 * A trava "esta obra ficaria sem engenheiro responsável" era lida **fora** de
 * transação, e funcionava — porque o `better-sqlite3` era síncrono. Num
 * processo de uma linha só, nada roda entre a contagem e a gravação.
 *
 * A migração para Postgres, em 17/09/2026, pôs um `await` no meio. A partir daí
 * duas requisições simultâneas podem **as duas** contar 2, passar pela trava e
 * revogar, e a obra acaba com zero engenheiros. É regressão da migração, não
 * defeito antigo, e foi encontrada pela frente que converteu o módulo.
 *
 * A expectativa vem da regra, não da implementação: `docs/prd/v1.md`, decisão
 * 26.1 — **toda obra tem ao menos um engenheiro ativo**. Ao contrário do uso
 * único do convite, aqui não existe restrição no banco por trás: "ao menos um"
 * olha outras linhas e não cabe num `CHECK`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  concedeAcessoDeEngenheiro,
  listaAcessosDaObra,
  revogaAcesso,
  type Ator,
} from '../src/modules/acesso';
import type { AcessoId, ObraId } from '../src/shared/id';
import {
  AGORA,
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from './fixtures/cenario-de-cadastro';

let cenario: Cenario;
let obraId: ObraId;
let primeira: Ator;

beforeEach(async () => {
  cenario = await montaCenario();
  primeira = await cenario.novoEngenheiro('eng1@exemplo.invalido');
  obraId = await criaObraDoPrd(primeira, cenario.amb);
});

afterEach(async () => {
  await cenario.fecha();
});

/**
 * Conta direto no banco, e não pela leitura protegida.
 *
 * A primeira versão usava `listaAcessosDaObra` com a engenheira que criou a
 * obra — e quebrou, por um motivo que vale registrar: **uma das duas revogações
 * concorrentes pode ser a dela**. Quando era, ela perdia o acesso de engenheiro
 * e deixava de poder listar, e o teste falhava por permissão em vez de medir a
 * invariante.
 *
 * O que se quer saber aqui é um fato do banco — "sobrou linha de engenheiro
 * ativo?" —, e não o que alguém consegue ver.
 */
async function engenheirosAtivos(): Promise<number> {
  const linhas = await cenario.conexao.consulta<{ n: number }>(
    `SELECT count(*)::int AS n FROM acesso
      WHERE obra_id = $1 AND perfil = 'engenheiro' AND revogado_em IS NULL`,
    [obraId],
  );
  return linhas[0]?.n ?? -1;
}

/** Os ids dos acessos de engenheiro, para revogar. */
async function idsDeEngenheiro(): Promise<AcessoId[]> {
  const lista = await listaAcessosDaObra(obraId, primeira, cenario.amb);
  if (!lista.ok) throw new Error('não listei os acessos');
  return lista.valor.filter((a) => a.perfil === 'engenheiro').map((a) => a.id);
}

describe('revogação concorrente de engenheiro', () => {
  it('com dois engenheiros, duas revogações simultâneas deixam um de pé', async () => {
    const segunda = await cenario.novoEngenheiro('eng2@exemplo.invalido');
    await concedeAcessoDeEngenheiro(cenario.amb.db, obraId, segunda.usuarioId, AGORA);

    expect(await engenheirosAtivos()).toBe(2);
    const [a, b] = await idsDeEngenheiro();
    if (a === undefined || b === undefined) throw new Error('faltou engenheiro');

    /*
     * As duas ao mesmo tempo, sem `await` entre elas. É o que reproduz a
     * corrida: sem o bloqueio de linha, as duas contam 2 e as duas revogam.
     */
    const [uma, outra] = await Promise.all([
      revogaAcesso(a, primeira, cenario.amb),
      revogaAcesso(b, primeira, cenario.amb),
    ]);

    // Uma passa e a outra é recusada — nunca as duas.
    expect([uma.ok, outra.ok].filter(Boolean)).toHaveLength(1);
    expect(await engenheirosAtivos()).toBe(1);
  });

  it('com um engenheiro só, revogar é recusado', async () => {
    const [unico] = await idsDeEngenheiro();
    if (unico === undefined) throw new Error('faltou o engenheiro da criação');

    const r = await revogaAcesso(unico, primeira, cenario.amb);

    expect(r.ok).toBe(false);
    expect(await engenheirosAtivos()).toBe(1);
  });
});
