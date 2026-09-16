/**
 * Autenticação do engenheiro e sessão.
 *
 * Origem das expectativas: PRD, "Requisitos de segurança e de dado pessoal";
 * `CLAUDE.md`, Segurança; `.claude/skills/checklist-seguranca`, via
 * docs/arquitetura/v1.md, 2.6 (cookie `HttpOnly`, `Secure`, `SameSite=Lax`,
 * id opaco, expiração) e pergunta P1 (e-mail e senha para o engenheiro).
 *
 * Não há caso CT para este arquivo: o mecanismo de entrada do engenheiro era a
 * pergunta P1 da arquitetura e não estava coberto pelo QA. Cada `it` cita a
 * regra de segurança que o justifica.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraAcesso } from '../../app/_composicao/ambiente-de-cadastro';
import { montaCenario, type Cenario } from '../../../test/fixtures/cenario-de-cadastro';
import { relogioMovel } from '../../../test/fixtures/banco-de-teste';
import {
  autenticaRequisicao,
  encerraSessao,
  HORAS_DE_SESSAO,
  iniciaSessaoComSenha,
  registraUsuario,
} from './autenticacao';
import { geraHashDeSenha, verificaSenha } from './senha';
import { leCookie, NOME_DO_COOKIE_DE_SESSAO } from './token';
import type { Ambiente } from './tipos';

let cenario: Cenario;
let amb: Ambiente;

beforeEach(() => {
  cenario = montaCenario();
  amb = paraAcesso(cenario.amb);
});

afterEach(() => {
  cenario.fecha();
});

const SENHA = 'uma senha comprida de teste 1234';

describe('senha do engenheiro', () => {
  it('confere a senha certa', async () => {
    const hash = await geraHashDeSenha(SENHA);
    expect(await verificaSenha(SENHA, hash)).toBe(true);
  });

  it('recusa a senha errada', async () => {
    const hash = await geraHashDeSenha(SENHA);
    expect(await verificaSenha(`${SENHA}x`, hash)).toBe(false);
  });

  it('gera sal por usuário: a mesma senha não produz o mesmo hash', async () => {
    // Sem sal, duas contas com a mesma senha têm o mesmo hash e uma tabela
    // pronta quebra as duas de uma vez.
    const primeiro = await geraHashDeSenha(SENHA);
    const segundo = await geraHashDeSenha(SENHA);
    expect(primeiro).not.toBe(segundo);
  });

  it('não guarda a senha em claro em lugar nenhum do hash', async () => {
    const hash = await geraHashDeSenha(SENHA);
    expect(hash).not.toContain(SENHA);
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  it('devolve falso, e não exceção, para hash malformado no banco', async () => {
    // Registro corrompido não pode virar erro 500 na tela de entrada.
    expect(await verificaSenha(SENHA, 'lixo')).toBe(false);
    expect(await verificaSenha(SENHA, 'scrypt$0$0$0$a$b')).toBe(false);
  });
});

describe('entrada e sessão', () => {
  it('a senha em claro não é gravada na tabela de usuário', async () => {
    const criado = await registraUsuario(
      { nome: 'E1', email: 'e1@exemplo.invalido', senha: SENHA },
      amb,
    );
    expect(criado.ok).toBe(true);

    const linhas = cenario.conexao.sqlite.prepare('SELECT * FROM usuario').all();
    expect(JSON.stringify(linhas)).not.toContain(SENHA);
  });

  it('abre a sessão com e-mail e senha corretos', async () => {
    await registraUsuario(
      { nome: 'E1', email: 'e1@exemplo.invalido', senha: SENHA },
      amb,
    );

    const entrada = await iniciaSessaoComSenha('e1@exemplo.invalido', SENHA, amb);
    expect(entrada.ok).toBe(true);
  });

  it('aceita o e-mail em caixa alta, porque o e-mail é normalizado ao gravar', async () => {
    await registraUsuario(
      { nome: 'E1', email: 'e1@exemplo.invalido', senha: SENHA },
      amb,
    );

    const entrada = await iniciaSessaoComSenha('E1@Exemplo.Invalido', SENHA, amb);
    expect(entrada.ok).toBe(true);
  });

  it('dá a mesma mensagem para senha errada e para e-mail desconhecido', async () => {
    // Mensagens diferentes viram uma lista de quem tem conta no sistema.
    await registraUsuario(
      { nome: 'E1', email: 'e1@exemplo.invalido', senha: SENHA },
      amb,
    );

    const senhaErrada = await iniciaSessaoComSenha('e1@exemplo.invalido', 'outra', amb);
    const desconhecido = await iniciaSessaoComSenha(
      'ninguem@exemplo.invalido',
      SENHA,
      amb,
    );

    expect(senhaErrada.ok).toBe(false);
    expect(desconhecido.ok).toBe(false);
    if (senhaErrada.ok || desconhecido.ok) return;
    expect(senhaErrada.erro.mensagem).toBe(desconhecido.erro.mensagem);
  });

  it('o cookie é HttpOnly, Secure e SameSite=Lax', async () => {
    await registraUsuario(
      { nome: 'E1', email: 'e1@exemplo.invalido', senha: SENHA },
      amb,
    );
    const entrada = await iniciaSessaoComSenha('e1@exemplo.invalido', SENHA, amb);
    expect(entrada.ok).toBe(true);
    if (!entrada.ok) return;

    expect(entrada.valor.atributos.httpOnly).toBe(true);
    expect(entrada.valor.atributos.secure).toBe(true);
    expect(entrada.valor.atributos.sameSite).toBe('lax');
  });

  it('o valor do cookie é opaco: não carrega id de usuário nem de sessão', async () => {
    await registraUsuario(
      { nome: 'E1', email: 'e1@exemplo.invalido', senha: SENHA },
      amb,
    );
    const entrada = await iniciaSessaoComSenha('e1@exemplo.invalido', SENHA, amb);
    expect(entrada.ok).toBe(true);
    if (!entrada.ok) return;

    expect(entrada.valor.token).not.toContain(entrada.valor.ator.usuarioId);
    expect(entrada.valor.token).not.toContain(entrada.valor.ator.sessaoId);
  });

  it('o banco guarda o hash do cookie, nunca o valor em claro', async () => {
    await registraUsuario(
      { nome: 'E1', email: 'e1@exemplo.invalido', senha: SENHA },
      amb,
    );
    const entrada = await iniciaSessaoComSenha('e1@exemplo.invalido', SENHA, amb);
    expect(entrada.ok).toBe(true);
    if (!entrada.ok) return;

    const linhas = cenario.conexao.sqlite.prepare('SELECT * FROM sessao').all();
    expect(JSON.stringify(linhas)).not.toContain(entrada.valor.token);
  });

  it('reconhece o portador da sessão aberta', async () => {
    await registraUsuario(
      { nome: 'E1', email: 'e1@exemplo.invalido', senha: SENHA },
      amb,
    );
    const entrada = await iniciaSessaoComSenha('e1@exemplo.invalido', SENHA, amb);
    expect(entrada.ok).toBe(true);
    if (!entrada.ok) return;

    const ator = autenticaRequisicao(entrada.valor.token, amb);
    expect(ator.ok && ator.valor.usuarioId).toBe(entrada.valor.ator.usuarioId);
  });

  it('recusa cookie ausente, desconhecido e vazio, com a mesma mensagem', () => {
    const ausente = autenticaRequisicao(undefined, amb);
    const desconhecido = autenticaRequisicao('inventado', amb);
    const vazio = autenticaRequisicao('', amb);

    expect(ausente.ok || desconhecido.ok || vazio.ok).toBe(false);
    if (ausente.ok || desconhecido.ok) return;
    expect(ausente.erro.mensagem).toBe(desconhecido.erro.mensagem);
  });

  it('a sessão expira: depois do prazo o mesmo cookie não vale mais', async () => {
    const relogio = relogioMovel('2026-09-16T08:00:00.000Z');
    const comRelogio: Ambiente = { db: amb.db, relogio: relogio.agora };
    await registraUsuario(
      { nome: 'E1', email: 'e1@exemplo.invalido', senha: SENHA },
      comRelogio,
    );
    const entrada = await iniciaSessaoComSenha('e1@exemplo.invalido', SENHA, comRelogio);
    expect(entrada.ok).toBe(true);
    if (!entrada.ok) return;

    // Um minuto antes do prazo ainda vale; um minuto depois, não.
    relogio.vaiPara('2026-09-16T19:59:00.000Z');
    expect(autenticaRequisicao(entrada.valor.token, comRelogio).ok).toBe(true);

    relogio.vaiPara('2026-09-16T20:01:00.000Z');
    expect(autenticaRequisicao(entrada.valor.token, comRelogio).ok).toBe(false);
    expect(HORAS_DE_SESSAO).toBe(12);
  });

  it('sair invalida a sessão no servidor, não só no navegador', async () => {
    await registraUsuario(
      { nome: 'E1', email: 'e1@exemplo.invalido', senha: SENHA },
      amb,
    );
    const entrada = await iniciaSessaoComSenha('e1@exemplo.invalido', SENHA, amb);
    expect(entrada.ok).toBe(true);
    if (!entrada.ok) return;

    encerraSessao(entrada.valor.token, amb);

    expect(autenticaRequisicao(entrada.valor.token, amb).ok).toBe(false);
  });

  it('recusa criar duas contas com o mesmo e-mail, sem confirmar que ele existe', async () => {
    await registraUsuario(
      { nome: 'E1', email: 'e1@exemplo.invalido', senha: SENHA },
      amb,
    );
    const repetido = await registraUsuario(
      { nome: 'Outro', email: 'E1@exemplo.invalido', senha: SENHA },
      amb,
    );

    expect(repetido.ok).toBe(false);
    if (repetido.ok) return;
    expect(repetido.erro.mensagem).not.toContain('e1@exemplo.invalido');
  });
});

describe('leitura do cookie da requisição', () => {
  it('encontra o cookie de sessão entre outros', () => {
    const requisicao = new Request('https://exemplo.invalido/', {
      headers: { cookie: `outro=1; ${NOME_DO_COOKIE_DE_SESSAO}=abc123; mais=2` },
    });
    expect(leCookie(requisicao, NOME_DO_COOKIE_DE_SESSAO)).toBe('abc123');
  });

  it('devolve indefinido quando não há cookie nenhum', () => {
    const requisicao = new Request('https://exemplo.invalido/');
    expect(leCookie(requisicao, NOME_DO_COOKIE_DE_SESSAO)).toBeUndefined();
  });
});
