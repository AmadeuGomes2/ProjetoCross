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
import { idConfiavel, type AcessoId, type ObraId } from '../../shared/id';
import { aceitaConvite, geraConvite, listaAcessosDaObra } from './convite';
import type { Ambiente, Ator } from './tipos';

let cenario: Cenario;
let e1: Ator;
let obraId: ObraId;

beforeEach(() => {
  cenario = montaCenario();
  e1 = cenario.novoAtor('e1@exemplo.invalido');
  obraId = criaObraDoPrd(e1, cenario.amb);
});

afterEach(() => {
  restauraEscritorPadrao();
  cenario.fecha();
});

function ambDeAcesso(): Ambiente {
  return paraAcesso(cenario.amb);
}

function idDoAcessoDe(ator: Ator): AcessoId {
  const lista = listaAcessosDaObra(obraId, e1, ambDeAcesso());
  if (!lista.ok) throw new Error(lista.erro.mensagem);
  const linha = lista.valor.find((a) => a.usuarioId === ator.usuarioId);
  if (linha === undefined) throw new Error('acesso não encontrado');
  return linha.id;
}

describe('F3.1 — convite do encarregado', () => {
  it('CT-072 o convite aceito dá acesso a uma obra só', () => {
    const e2 = cenario.novoAtor('e2@exemplo.invalido');
    const outra = criaObraProtegida(
      e2,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );
    expect(outra.ok).toBe(true);
    if (!outra.ok) return;

    const convite = geraConviteProtegido(e1, obraId, cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    const aceite = aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());

    expect(aceite.ok && aceite.valor).toBe(obraId);
    expect(obtemCabecalhoProtegido(c1, obraId, cenario.amb).ok).toBe(true);
    expect(obtemCabecalhoProtegido(c1, outra.valor, cenario.amb).ok).toBe(false);
  });

  it('CT-073 o acesso registra que foi liberado por quem gerou o convite', () => {
    const convite = geraConviteProtegido(e1, obraId, cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    expect(aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso()).ok).toBe(true);

    const linha = cenario.conexao.sqlite
      .prepare(
        'SELECT perfil, liberado_por, liberado_em FROM acesso WHERE usuario_id = ?',
      )
      .get(c1.usuarioId);

    expect(linha).toEqual({
      perfil: 'encarregado',
      liberado_por: e1.usuarioId,
      liberado_em: '2026-09-16T12:00:00.000Z',
    });
  });

  it('CT-074 o encarregado só enxerga a obra liberada', () => {
    const e2 = cenario.novoAtor('e2@exemplo.invalido');
    criaObraProtegida(
      e2,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );

    const convite = geraConviteProtegido(e1, obraId, cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());

    const obras = listaObrasDoUsuarioProtegida(c1.usuarioId, cenario.amb);
    expect(obras.ok).toBe(true);
    if (!obras.ok) return;
    expect(obras.valor.map((o) => o.obraId)).toEqual([obraId]);
  });

  it('CT-075 pedir dado de outra obra é recusado sem revelar que ela existe', () => {
    const e2 = cenario.novoAtor('e2@exemplo.invalido');
    const outra = criaObraProtegida(
      e2,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );
    expect(outra.ok).toBe(true);
    if (!outra.ok) return;

    const convite = geraConviteProtegido(e1, obraId, cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());

    const daOutra = obtemCabecalhoProtegido(c1, outra.valor, cenario.amb);
    const deInexistente = obtemCabecalhoProtegido(
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

  it('CT-076 o encarregado não gera convite', () => {
    const convite = geraConviteProtegido(e1, obraId, cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());

    expect(geraConviteProtegido(c1, obraId, cenario.amb).ok).toBe(false);
  });

  it('CT-077 o convite é de uso único: o segundo aceite é recusado', () => {
    const convite = geraConviteProtegido(e1, obraId, cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    const c2 = cenario.novoAtor('c2@exemplo.invalido');
    expect(aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso()).ok).toBe(true);

    const segundo = aceitaConvite(convite.valor.token, c2.usuarioId, ambDeAcesso());

    expect(segundo.ok).toBe(false);
    if (segundo.ok) return;
    expect(segundo.erro.mensagem).toContain('já foi utilizado');
    expect(obtemCabecalhoProtegido(c2, obraId, cenario.amb).ok).toBe(false);
  });

  it('CT-078 aceita no último minuto dentro dos 7 dias', () => {
    const relogio = relogioMovel('2026-09-01T10:00:00.000Z');
    const amb: Ambiente = { db: cenario.amb.db, relogio: relogio.agora };

    const convite = geraConvite(obraId, e1, amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    relogio.vaiPara('2026-09-08T09:59:00.000Z');
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    const aceite = aceitaConvite(convite.valor.token, c1.usuarioId, amb);

    expect(aceite.ok).toBe(true);
  });

  it('CT-079 recusa no primeiro minuto fora dos 7 dias e diz que expirou', () => {
    const relogio = relogioMovel('2026-09-01T10:00:00.000Z');
    const amb: Ambiente = { db: cenario.amb.db, relogio: relogio.agora };

    const convite = geraConvite(obraId, e1, amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    relogio.vaiPara('2026-09-08T10:01:00.000Z');
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    const aceite = aceitaConvite(convite.valor.token, c1.usuarioId, amb);

    expect(aceite.ok).toBe(false);
    if (aceite.ok) return;
    expect(aceite.erro.mensagem).toBe(
      'O convite expirou. Peça um link novo ao engenheiro responsável.',
    );
  });

  it('CT-080 a mesma obra aceita dois encarregados', () => {
    const primeiro = geraConviteProtegido(e1, obraId, cenario.amb);
    const segundo = geraConviteProtegido(e1, obraId, cenario.amb);
    expect(primeiro.ok && segundo.ok).toBe(true);
    if (!primeiro.ok || !segundo.ok) return;

    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    const c2 = cenario.novoAtor('c2@exemplo.invalido');
    expect(aceitaConvite(primeiro.valor.token, c1.usuarioId, ambDeAcesso()).ok).toBe(
      true,
    );
    expect(aceitaConvite(segundo.valor.token, c2.usuarioId, ambDeAcesso()).ok).toBe(true);

    const acessos = listaAcessosDaObra(obraId, e1, ambDeAcesso());
    expect(
      acessos.ok && acessos.valor.filter((a) => a.perfil === 'encarregado'),
    ).toHaveLength(2);
  });

  it('CT-081 a revogação vale já na requisição seguinte', () => {
    const convite = geraConviteProtegido(e1, obraId, cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());
    expect(obtemCabecalhoProtegido(c1, obraId, cenario.amb).ok).toBe(true);

    const revogado = revogaAcessoProtegido(e1, idDoAcessoDe(c1), cenario.amb);
    expect(revogado.ok).toBe(true);

    expect(obtemCabecalhoProtegido(c1, obraId, cenario.amb).ok).toBe(false);
  });

  it('CT-082 revogar não apaga a linha de acesso nem o histórico', () => {
    const convite = geraConviteProtegido(e1, obraId, cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    aceitaConvite(convite.valor.token, c1.usuarioId, ambDeAcesso());
    revogaAcessoProtegido(e1, idDoAcessoDe(c1), cenario.amb);

    const linha = cenario.conexao.sqlite
      .prepare('SELECT revogado_por, revogado_em FROM acesso WHERE usuario_id = ?')
      .get(c1.usuarioId);

    expect(linha).toEqual({
      revogado_por: e1.usuarioId,
      revogado_em: '2026-09-16T12:00:00.000Z',
    });
  });

  it('CT-083 um encarregado não revoga o acesso do outro', () => {
    const primeiro = geraConviteProtegido(e1, obraId, cenario.amb);
    const segundo = geraConviteProtegido(e1, obraId, cenario.amb);
    if (!primeiro.ok || !segundo.ok) return;
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    const c2 = cenario.novoAtor('c2@exemplo.invalido');
    aceitaConvite(primeiro.valor.token, c1.usuarioId, ambDeAcesso());
    aceitaConvite(segundo.valor.token, c2.usuarioId, ambDeAcesso());

    const resultado = revogaAcessoProtegido(c1, idDoAcessoDe(c2), cenario.amb);

    expect(resultado.ok).toBe(false);
    expect(obtemCabecalhoProtegido(c2, obraId, cenario.amb).ok).toBe(true);
  });

  it('CT-084 engenheiro de outra obra não gera convite para esta', () => {
    const e2 = cenario.novoAtor('e2@exemplo.invalido');
    criaObraProtegida(
      e2,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );

    expect(geraConviteProtegido(e2, obraId, cenario.amb).ok).toBe(false);
  });

  it('CT-085 o token não aparece no log nem na mensagem quando o aceite falha', () => {
    const eventos: EventoDeLog[] = [];
    defineEscritor((evento) => eventos.push(evento));

    const convite = geraConviteProtegido(e1, obraId, cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;
    const token = convite.valor.token;

    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    expect(aceitaConvite(token, c1.usuarioId, ambDeAcesso()).ok).toBe(true);

    const c2 = cenario.novoAtor('c2@exemplo.invalido');
    const falha = aceitaConvite(token, c2.usuarioId, ambDeAcesso());
    expect(falha.ok).toBe(false);
    if (falha.ok) return;

    const registrado = JSON.stringify(eventos);
    expect(registrado).not.toContain(token);
    expect(falha.erro.mensagem).not.toContain(token);
  });

  it('o token em claro nunca é gravado: o banco guarda só o hash', () => {
    const convite = geraConviteProtegido(e1, obraId, cenario.amb);
    expect(convite.ok).toBe(true);
    if (!convite.ok) return;

    const linhas = cenario.conexao.sqlite.prepare('SELECT * FROM convite').all();
    expect(JSON.stringify(linhas)).not.toContain(convite.valor.token);
  });

  it('o convite expira exatamente 7 dias depois de gerado', () => {
    const relogio = relogioMovel('2026-09-01T10:00:00.000Z');
    const convite = geraConvite(obraId, e1, {
      db: cenario.amb.db,
      relogio: relogio.agora,
    });

    expect(convite.ok && convite.valor.expiraEm).toBe('2026-09-08T10:00:00.000Z');
  });
});
