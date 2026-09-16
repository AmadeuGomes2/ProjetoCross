/**
 * A primeira conta de engenheiro, criada fora da web.
 *
 * Decisão 25.1, de 16/09/2026: "não há cadastro público: a primeira conta de
 * engenheiro nasce por comando de instalação". Este arquivo cobre o caso de uso
 * por trás de `npm run criar-engenheiro`; a leitura dos argumentos tem teste
 * próprio em `src/db/criar-engenheiro.test.ts`.
 *
 * As três regras que o comando precisa cumprir, e de onde vêm:
 *
 * 1. **Idempotente no sentido seguro:** rodar duas vezes com o mesmo e-mail não
 *    cria duas contas **nem reseta a senha em silêncio**.
 * 2. **Avisa e recusa** quando já existe conta de engenheiro no sistema, e só
 *    prossegue com opção explícita. Comando de instalação que cria conta de
 *    administrador em produção sem atrito é porta dos fundos.
 * 3. A senha em claro **não é gravada**: o banco guarda o hash de `scrypt`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraAcesso } from '../../app/_composicao/ambiente-de-cadastro';
import { CODIGO_ERRO } from '../../shared/result';
import {
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import {
  criaContaDeEngenheiroDeInstalacao,
  SENHA_MINIMA_DE_CARACTERES,
} from './instalacao';
import { verificaSenha } from './senha';

const SENHA = 'ponte-cavalo-bateria-grampo';

let cenario: Cenario;

/** Quantas vezes a senha foi pedida: o prompt só pode acontecer quando a conta
 *  vai mesmo nascer. Pedir o segredo e jogá-lo fora é expô-lo à toa. */
let senhasPedidas = 0;

beforeEach(() => {
  cenario = montaCenario();
  senhasPedidas = 0;
});

afterEach(() => {
  cenario.fecha();
});

function cria(email: string, senha: string, mesmoComEngenheiroExistente = false) {
  return criaContaDeEngenheiroDeInstalacao(
    {
      nome: 'E1',
      email,
      mesmoComEngenheiroExistente,
      pedeSenha: async () => {
        senhasPedidas += 1;
        return senha;
      },
    },
    paraAcesso(cenario.amb),
  );
}

function linhaDoUsuario(email: string): {
  id: string;
  hash_de_senha: string | null;
  e_engenheiro: number;
} {
  return cenario.conexao.sqlite
    .prepare('SELECT id, hash_de_senha, e_engenheiro FROM usuario WHERE email = ?')
    .get(email) as { id: string; hash_de_senha: string | null; e_engenheiro: number };
}

function totalDeUsuarios(): number {
  const linha = cenario.conexao.sqlite
    .prepare('SELECT count(*) AS total FROM usuario')
    .get() as { total: number };
  return linha.total;
}

describe('comando de instalação: primeira conta de engenheiro', () => {
  it('cria a conta no sistema vazio e guarda o hash, nunca a senha', async () => {
    const resultado = await cria('e1@exemplo.invalido', SENHA);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.situacao).toBe('conta_criada');

    const linha = linhaDoUsuario('e1@exemplo.invalido');
    expect(linha.hash_de_senha).not.toBe(null);
    expect(linha.hash_de_senha).not.toContain(SENHA);
    expect(await verificaSenha(SENHA, linha.hash_de_senha ?? '')).toBe(true);
  });

  it('liga a coluna de engenheiro da conta que cria', async () => {
    // É o que separa esta conta de todas as outras: ser engenheiro é atributo
    // da pessoa (CREA, assinatura do bloco 11), e não perfil numa obra. Este
    // comando é o único caminho que liga a coluna.
    expect((await cria('e1@exemplo.invalido', SENHA)).ok).toBe(true);

    expect(linhaDoUsuario('e1@exemplo.invalido').e_engenheiro).toBe(1);
  });

  it('rodar de novo com o mesmo e-mail não cria segunda conta nem troca a senha', async () => {
    expect((await cria('e1@exemplo.invalido', SENHA)).ok).toBe(true);
    const antes = linhaDoUsuario('e1@exemplo.invalido');

    const segunda = await cria('E1@Exemplo.Invalido', 'outra-senha-bem-diferente');

    expect(segunda.ok).toBe(true);
    if (!segunda.ok) return;
    expect(segunda.valor.situacao).toBe('conta_ja_existia');
    expect(totalDeUsuarios()).toBe(1);
    // A segunda execução nem chega a pedir senha: não há o que fazer com ela.
    expect(senhasPedidas).toBe(1);
    // A senha antiga continua valendo, e a nova não vale: nada foi resetado.
    const depois = linhaDoUsuario('e1@exemplo.invalido');
    expect(depois.hash_de_senha).toBe(antes.hash_de_senha);
    expect(
      await verificaSenha('outra-senha-bem-diferente', depois.hash_de_senha ?? ''),
    ).toBe(false);
  });

  it('recusa quando o sistema já tem engenheiro, e não cria conta nenhuma', async () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    criaObraDoPrd(e1, cenario.amb);
    const antes = totalDeUsuarios();

    const resultado = await cria('e2@exemplo.invalido', SENHA);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.JA_EXISTE);
    expect(resultado.erro.mensagem).toContain('--forcar');
    expect(totalDeUsuarios()).toBe(antes);
    expect(senhasPedidas).toBe(0);
  });

  it('prossegue com a opção explícita, mesmo com engenheiro no sistema', async () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    criaObraDoPrd(e1, cenario.amb);

    const resultado = await cria('e2@exemplo.invalido', SENHA, true);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.situacao).toBe('conta_criada');
  });

  it('recusa a senha curta demais, antes de gravar qualquer coisa', async () => {
    const curta = 'a'.repeat(SENHA_MINIMA_DE_CARACTERES - 1);

    const resultado = await cria('e1@exemplo.invalido', curta);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.CAMPO_OBRIGATORIO);
    expect(totalDeUsuarios()).toBe(0);
  });

  it('não devolve o e-mail nem a senha na mensagem de erro', async () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    criaObraDoPrd(e1, cenario.amb);

    const resultado = await cria('pessoa@exemplo.invalido', SENHA);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.mensagem).not.toContain('pessoa@exemplo.invalido');
    expect(resultado.erro.mensagem).not.toContain(SENHA);
  });
});
