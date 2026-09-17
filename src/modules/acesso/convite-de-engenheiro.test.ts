/**
 * Decisão 34.1 — **um engenheiro pode dar acesso de engenheiro a outra pessoa**
 * na obra.
 *
 * Origem das expectativas, nenhuma lida da implementação:
 *
 * - `docs/prd/v1.md`, DECISÕES TOMADAS, 34.1: "Um engenheiro pode dar acesso de
 *   engenheiro a outra pessoa na obra. Resolve a saída do engenheiro sem exigir
 *   acesso ao servidor";
 * - decisão 25.1: quem cria obra é quem tem `usuario.e_engenheiro` ligada. Sem
 *   ligar a coluna no aceite, o convidado vira engenheiro **da obra** e continua
 *   sem poder criar outra — que é exatamente o travamento que a 34.1 resolve;
 * - decisão 14.0: o convite é de uso único, vale 7 dias e **só o engenheiro
 *   daquela obra o gera**. A 34.1 acrescenta o perfil ao convite, não afrouxa
 *   quem convida;
 * - `CLAUDE.md`, seção Segurança: "Perfis são fronteira de confiança... isso é
 *   verificado no servidor, em toda requisição".
 *
 * O caso que a frente anterior não conseguiu provar, e que está aqui: o convite
 * de **encarregado não liga** `usuario.e_engenheiro`. É a metade negativa; sem
 * ela, ligar a coluna para todo mundo passaria no teste positivo.
 */

import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraAcesso } from '../../app/_composicao/ambiente-de-cadastro';
import { criaObraProtegida, geraConviteProtegido } from '../../app/_composicao/cadastro';
import {
  criaObraDoPrd,
  DADOS_DA_OBRA,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import { convite as tabelaDeConvite, usuario } from '../../db/schema';
import type { ObraId } from '../../shared/id';
import { CODIGO_ERRO } from '../../shared/result';
import { aceitaConvite, listaAcessosDaObra, perfilDeConvite } from './convite';
import type { Ambiente, Ator } from './tipos';

let cenario: Cenario;
let e1: Ator;
let obraId: ObraId;

beforeEach(async () => {
  cenario = await montaCenario();
  e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
  obraId = await criaObraDoPrd(e1, cenario.amb);
});

afterEach(async () => {
  await cenario.fecha();
});

function ambDeAcesso(): Ambiente {
  return paraAcesso(cenario.amb);
}

async function eEngenheiroNaConta(ator: Ator): Promise<number> {
  const linhas = await cenario.conexao.db
    .select({ eEngenheiro: usuario.eEngenheiro })
    .from(usuario)
    .where(eq(usuario.id, ator.usuarioId));
  const linha = linhas[0];
  if (linha === undefined) throw new Error('conta não encontrada');
  return linha.eEngenheiro;
}

async function perfilDoAcessoDe(ator: Ator): Promise<string | undefined> {
  const lista = await listaAcessosDaObra(obraId, e1, ambDeAcesso());
  if (!lista.ok) throw new Error(lista.erro.mensagem);
  return lista.valor.find((a) => a.usuarioId === ator.usuarioId)?.perfil;
}

describe('decisão 34.1 — convite de engenheiro', () => {
  it('o convite de engenheiro aceito dá perfil de engenheiro na obra', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'engenheiro', cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    const e2 = await cenario.novoAtor('e2@exemplo.invalido');
    const aceite = await aceitaConvite(convite.valor.token, e2.usuarioId, ambDeAcesso());

    expect(aceite.ok).toBe(true);
    expect(await perfilDoAcessoDe(e2)).toBe('engenheiro');
  });

  it('aceitar convite de engenheiro liga a coluna de engenheiro da conta', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'engenheiro', cenario.amb);
    if (!convite.ok) return;
    const e2 = await cenario.novoAtor('e2@exemplo.invalido');
    expect(await eEngenheiroNaConta(e2)).toBe(0);

    expect(
      (await aceitaConvite(convite.valor.token, e2.usuarioId, ambDeAcesso())).ok,
    ).toBe(true);

    expect(await eEngenheiroNaConta(e2)).toBe(1);
  });

  it('aceitar convite de encarregado NÃO liga a coluna de engenheiro da conta', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    if (!convite.ok) return;
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');

    expect(
      (await aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso())).ok,
    ).toBe(true);

    expect(await eEngenheiroNaConta(c1)).toBe(0);
    expect(await perfilDoAcessoDe(c1)).toBe('encarregado');
  });

  it('quem entrou por convite de engenheiro passa a criar obra (decisão 25.1)', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'engenheiro', cenario.amb);
    if (!convite.ok) return;
    const e2 = await cenario.novoAtor('e2@exemplo.invalido');
    await aceitaConvite(convite.valor.token, e2.usuarioId, ambDeAcesso());

    const outra = await criaObraProtegida(
      e2,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );

    expect(outra.ok).toBe(true);
  });

  it('quem entrou por convite de encarregado continua sem criar obra', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    if (!convite.ok) return;
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    await aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());

    const outra = await criaObraProtegida(
      c1,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );

    expect(outra.ok).toBe(false);
  });

  it('o perfil pedido é gravado na linha do convite', async () => {
    expect((await geraConviteProtegido(e1, obraId, 'engenheiro', cenario.amb)).ok).toBe(
      true,
    );

    const linhas = await cenario.conexao.db
      .select({ perfil: tabelaDeConvite.perfil })
      .from(tabelaDeConvite);

    expect(linhas.map((l) => l.perfil)).toEqual(['engenheiro']);
  });

  it('o encarregado não gera convite de engenheiro', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    if (!convite.ok) return;
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    await aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());

    const tentativa = await geraConviteProtegido(c1, obraId, 'engenheiro', cenario.amb);

    expect(tentativa.ok).toBe(false);
    expect(!tentativa.ok && tentativa.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
  });

  it('engenheiro de outra obra não gera convite de engenheiro para esta', async () => {
    const outra = await criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );
    expect(outra.ok).toBe(true);
    if (!outra.ok) return;

    const conviteDaOutra = await geraConviteProtegido(
      e1,
      outra.valor,
      'engenheiro',
      cenario.amb,
    );
    if (!conviteDaOutra.ok) return;
    const e2 = await cenario.novoAtor('e2@exemplo.invalido');
    await aceitaConvite(conviteDaOutra.valor.token, e2.usuarioId, ambDeAcesso());

    expect((await geraConviteProtegido(e2, obraId, 'engenheiro', cenario.amb)).ok).toBe(
      false,
    );
  });

  it('o engenheiro convidado convida na obra em que entrou', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'engenheiro', cenario.amb);
    if (!convite.ok) return;
    const e2 = await cenario.novoAtor('e2@exemplo.invalido');
    await aceitaConvite(convite.valor.token, e2.usuarioId, ambDeAcesso());

    expect((await geraConviteProtegido(e2, obraId, 'encarregado', cenario.amb)).ok).toBe(
      true,
    );
  });

  it('perfil que não é dos dois é recusado antes de virar convite', () => {
    expect(perfilDeConvite('engenheiro').ok).toBe(true);
    expect(perfilDeConvite('encarregado').ok).toBe(true);
    expect(perfilDeConvite('fiscal').ok).toBe(false);
    expect(perfilDeConvite('').ok).toBe(false);
    expect(perfilDeConvite(null).ok).toBe(false);
    expect(perfilDeConvite(7).ok).toBe(false);
  });
});
