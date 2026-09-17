/**
 * CT-072 a CT-085 — Acesso do encarregado
 * (`docs/qa/v1-casos-passos-1-3.md`, F3.1).
 *
 * Origem das expectativas: PRD, Funcionalidade 3.1 e decisão 14.0; R19 e R26;
 * PRD, "Requisitos de segurança", linha "Token do convite".
 *
 * As duas fronteiras dos 7 dias — 08/09 às 09h59 e às 10h01 — são testes
 * separados de propósito: com um só, um erro de sinal passa despercebido.
 */

import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraAcesso } from '../../app/_composicao/ambiente-de-cadastro';
import {
  geraConviteProtegido,
  listaObrasDoUsuarioProtegida,
  obtemCabecalhoProtegido,
  revogaAcessoProtegido,
} from '../../app/_composicao/cadastro';
import {
  criaObraDoPrd,
  DADOS_DA_OBRA,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import { criaObraProtegida } from '../../app/_composicao/cadastro';
import { relogioMovel } from '../../../test/fixtures/banco-de-teste';
import {
  defineEscritor,
  restauraEscritorPadrao,
  type EventoDeLog,
} from '../../shared/log';
// O SQL cru saiu com o `conexao.sqlite`, que o Postgres não tem: quem precisa
// conferir a linha gravada lê pelo próprio Drizzle. As tabelas entram com
// apelido porque `acesso` e `convite` também são nomes de variável aqui.
import { acesso as tabelaDeAcesso, convite as tabelaDeConvite } from '../../db/schema';
import { idConfiavel, type AcessoId, type ObraId } from '../../shared/id';
import { aceitaConvite, geraConvite, listaAcessosDaObra } from './convite';
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
  restauraEscritorPadrao();
  await cenario.fecha();
});

function ambDeAcesso(): Ambiente {
  return paraAcesso(cenario.amb);
}

async function idDoAcessoDe(ator: Ator): Promise<AcessoId> {
  const lista = await listaAcessosDaObra(obraId, e1, ambDeAcesso());
  if (!lista.ok) throw new Error(lista.erro.mensagem);
  const linha = lista.valor.find((a) => a.usuarioId === ator.usuarioId);
  if (linha === undefined) throw new Error('acesso não encontrado');
  return linha.id;
}

describe('F3.1 — convite do encarregado', () => {
  it('CT-072 o convite aceito dá acesso a uma obra só', async () => {
    // Desde a decisão 25.1, quem cria a segunda obra é quem já é engenheiro de
    // alguma: E1. Só a existência da outra obra importa para este caso.
    const outra = await criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );
    expect(outra.ok).toBe(true);
    if (!outra.ok) return;

    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    const aceite = await aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());

    expect(aceite.ok && aceite.valor).toBe(obraId);
    expect((await obtemCabecalhoProtegido(c1, obraId, cenario.amb)).ok).toBe(true);
    expect((await obtemCabecalhoProtegido(c1, outra.valor, cenario.amb)).ok).toBe(false);
  });

  it('CT-073 o acesso registra que foi liberado por quem gerou o convite', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    expect(
      (await aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso())).ok,
    ).toBe(true);

    const linhas = await cenario.conexao.db
      .select({
        perfil: tabelaDeAcesso.perfil,
        liberadoPor: tabelaDeAcesso.liberadoPor,
        liberadoEm: tabelaDeAcesso.liberadoEm,
      })
      .from(tabelaDeAcesso)
      .where(eq(tabelaDeAcesso.usuarioId, c1.usuarioId));

    expect(linhas).toEqual([
      {
        perfil: 'encarregado',
        liberadoPor: e1.usuarioId,
        liberadoEm: '2026-09-16T12:00:00.000Z',
      },
    ]);
  });

  it('CT-074 o encarregado só enxerga a obra liberada', async () => {
    const outra = await criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );
    expect(outra.ok).toBe(true);

    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    await aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());

    const obras = await listaObrasDoUsuarioProtegida(c1.usuarioId, cenario.amb);
    expect(obras.ok).toBe(true);
    if (!obras.ok) return;
    expect(obras.valor.map((o) => o.obraId)).toEqual([obraId]);
  });

  it('CT-075 pedir dado de outra obra é recusado sem revelar que ela existe', async () => {
    // Desde a decisão 25.1, quem cria a segunda obra é quem já é engenheiro de
    // alguma: E1. Só a existência da outra obra importa para este caso.
    const outra = await criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );
    expect(outra.ok).toBe(true);
    if (!outra.ok) return;

    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    await aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());

    const daOutra = await obtemCabecalhoProtegido(c1, outra.valor, cenario.amb);
    const deInexistente = await obtemCabecalhoProtegido(
      c1,
      idConfiavel<'obra'>('nao-existe-nenhuma-obra-com-este-id'),
      cenario.amb,
    );

    expect(daOutra.ok).toBe(false);
    expect(deInexistente.ok).toBe(false);
    if (daOutra.ok || deInexistente.ok) return;
    // A resposta não pode diferenciar "não existe" de "não é sua".
    expect(daOutra.erro.mensagem).toBe(deInexistente.erro.mensagem);
    expect(JSON.stringify(daOutra.erro)).not.toContain('P0999');
  });

  it('CT-076 o encarregado não gera convite', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    await aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());

    expect((await geraConviteProtegido(c1, obraId, 'encarregado', cenario.amb)).ok).toBe(
      false,
    );
  });

  it('CT-077 o convite é de uso único: o segundo aceite é recusado', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    const c2 = await cenario.novoAtor('c2@exemplo.invalido');
    expect(
      (await aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso())).ok,
    ).toBe(true);

    const segundo = await aceitaConvite(convite.valor.token, c2.usuarioId, ambDeAcesso());

    expect(segundo.ok).toBe(false);
    if (segundo.ok) return;
    expect(segundo.erro.mensagem).toContain('já foi utilizado');
    expect((await obtemCabecalhoProtegido(c2, obraId, cenario.amb)).ok).toBe(false);
  });

  it('CT-078 aceita no último minuto dentro dos 7 dias', async () => {
    const relogio = relogioMovel('2026-09-01T10:00:00.000Z');
    const amb: Ambiente = { db: cenario.amb.db, relogio: relogio.agora };

    const convite = await geraConvite(obraId, 'encarregado', e1, amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    relogio.vaiPara('2026-09-08T09:59:00.000Z');
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    const aceite = await aceitaConvite(convite.valor.token, c1.usuarioId, amb);

    expect(aceite.ok).toBe(true);
  });

  it('CT-079 recusa no primeiro minuto fora dos 7 dias e diz que expirou', async () => {
    const relogio = relogioMovel('2026-09-01T10:00:00.000Z');
    const amb: Ambiente = { db: cenario.amb.db, relogio: relogio.agora };

    const convite = await geraConvite(obraId, 'encarregado', e1, amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    relogio.vaiPara('2026-09-08T10:01:00.000Z');
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    const aceite = await aceitaConvite(convite.valor.token, c1.usuarioId, amb);

    expect(aceite.ok).toBe(false);
    if (aceite.ok) return;
    expect(aceite.erro.mensagem).toBe(
      'O convite expirou. Peça um link novo ao engenheiro responsável.',
    );
  });

  it('CT-080 a mesma obra aceita dois encarregados', async () => {
    const primeiro = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    const segundo = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    expect(primeiro.ok && segundo.ok).toBe(true);
    if (!primeiro.ok || !segundo.ok) return;

    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    const c2 = await cenario.novoAtor('c2@exemplo.invalido');
    expect(
      (await aceitaConvite(primeiro.valor.token, c1.usuarioId, ambDeAcesso())).ok,
    ).toBe(true);
    expect(
      (await aceitaConvite(segundo.valor.token, c2.usuarioId, ambDeAcesso())).ok,
    ).toBe(true);

    const acessos = await listaAcessosDaObra(obraId, e1, ambDeAcesso());
    expect(
      acessos.ok && acessos.valor.filter((a) => a.perfil === 'encarregado'),
    ).toHaveLength(2);
  });

  it('CT-081 a revogação vale já na requisição seguinte', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    await aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());
    expect((await obtemCabecalhoProtegido(c1, obraId, cenario.amb)).ok).toBe(true);

    const revogado = await revogaAcessoProtegido(e1, await idDoAcessoDe(c1), cenario.amb);
    expect(revogado.ok).toBe(true);

    expect((await obtemCabecalhoProtegido(c1, obraId, cenario.amb)).ok).toBe(false);
  });

  it('CT-082 revogar não apaga a linha de acesso nem o histórico', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    await aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());
    await revogaAcessoProtegido(e1, await idDoAcessoDe(c1), cenario.amb);

    const linhas = await cenario.conexao.db
      .select({
        revogadoPor: tabelaDeAcesso.revogadoPor,
        revogadoEm: tabelaDeAcesso.revogadoEm,
      })
      .from(tabelaDeAcesso)
      .where(eq(tabelaDeAcesso.usuarioId, c1.usuarioId));

    expect(linhas).toEqual([
      { revogadoPor: e1.usuarioId, revogadoEm: '2026-09-16T12:00:00.000Z' },
    ]);
  });

  it('CT-083 um encarregado não revoga o acesso do outro', async () => {
    const primeiro = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    const segundo = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    if (!primeiro.ok || !segundo.ok) return;
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    const c2 = await cenario.novoAtor('c2@exemplo.invalido');
    await aceitaConvite(primeiro.valor.token, c1.usuarioId, ambDeAcesso());
    await aceitaConvite(segundo.valor.token, c2.usuarioId, ambDeAcesso());

    const resultado = await revogaAcessoProtegido(
      c1,
      await idDoAcessoDe(c2),
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    expect((await obtemCabecalhoProtegido(c2, obraId, cenario.amb)).ok).toBe(true);
  });

  it('CT-084 engenheiro de outra obra não gera convite para esta', async () => {
    // E1 cria a outra obra, que é como uma segunda obra nasce desde a 25.1, e
    // E2 vira engenheiro **dela** por gravação direta na tabela, fora de
    // qualquer caminho de produto: o que está sob teste é a fronteira entre
    // obras, não como o acesso nasceu.
    const outra = await criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );
    expect(outra.ok).toBe(true);
    if (!outra.ok) return;

    const e2 = await cenario.novoAtor('e2@exemplo.invalido');
    await cenario.conexao.db.insert(tabelaDeAcesso).values({
      id: idConfiavel<'acesso'>('99999999-9999-4999-8999-999999999999'),
      obraId: outra.valor,
      usuarioId: e2.usuarioId,
      perfil: 'engenheiro',
      liberadoPor: e1.usuarioId,
      liberadoEm: '2026-09-16T12:00:00.000Z',
    });

    expect((await geraConviteProtegido(e2, obraId, 'encarregado', cenario.amb)).ok).toBe(
      false,
    );
  });

  it('CT-085 o token não aparece no log nem na mensagem quando o aceite falha', async () => {
    const eventos: EventoDeLog[] = [];
    defineEscritor((evento) => eventos.push(evento));

    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;
    const token = convite.valor.token;

    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    expect((await aceitaConvite(token, c1.usuarioId, ambDeAcesso())).ok).toBe(true);

    const c2 = await cenario.novoAtor('c2@exemplo.invalido');
    const falha = await aceitaConvite(token, c2.usuarioId, ambDeAcesso());
    expect(falha.ok).toBe(false);
    if (falha.ok) return;

    const registrado = JSON.stringify(eventos);
    expect(registrado).not.toContain(token);
    expect(falha.erro.mensagem).not.toContain(token);
  });

  it('o token em claro nunca é gravado: o banco guarda só o hash', async () => {
    const convite = await geraConviteProtegido(e1, obraId, 'encarregado', cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    const linhas = await cenario.conexao.db.select().from(tabelaDeConvite);
    expect(JSON.stringify(linhas)).not.toContain(convite.valor.token);
  });

  it('o convite expira exatamente 7 dias depois de gerado', async () => {
    const relogio = relogioMovel('2026-09-01T10:00:00.000Z');
    const gerado = await geraConvite(obraId, 'encarregado', e1, {
      db: cenario.amb.db,
      relogio: relogio.agora,
    });

    expect(gerado.ok && gerado.valor.expiraEm).toBe('2026-09-08T10:00:00.000Z');
  });
});
