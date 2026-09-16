/**
 * Apoio de teste: banco em memória, migrations aplicadas, taxonomias semeadas.
 *
 * Só dado sintético (CLAUDE.md, Segurança). Nenhum nome daqui é de pessoa real.
 *
 * Não toca o sistema de arquivos: `:memory:` do SQLite vive no processo, e o
 * relógio é sempre injetado (padroes-codigo, Testes: "nada de rede, relógio
 * real nem sistema de arquivos").
 */

import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { criaBanco, EM_MEMORIA, type ConexaoRdo } from '../../src/db';
import { semeiaTaxonomias } from '../../src/db/seed';
import type { Instante } from '../../src/shared/date/fuso';
import { geraId, type UsuarioId } from '../../src/shared/id';

const PASTA_DE_MIGRATIONS = fileURLToPath(
  new URL('../../src/db/migrations', import.meta.url),
);

export function criaBancoDeTeste(): ConexaoRdo {
  const conexao = criaBanco(EM_MEMORIA);
  migrate(conexao.db, { migrationsFolder: PASTA_DE_MIGRATIONS });
  semeiaTaxonomias(conexao.db, '2026-01-01T00:00:00.000Z');
  return conexao;
}

/** Relógio parado num instante conhecido. Todo teste que vê hora usa este. */
export function relogioFixo(iso: string): () => Date {
  return () => new Date(iso);
}

/**
 * Relógio que anda quando o teste mandar. Serve para as fronteiras de validade
 * do convite, em que o mesmo cenário precisa de dois instantes.
 */
export function relogioMovel(iso: string): {
  agora: () => Date;
  vaiPara(novo: string): void;
} {
  let atual = iso;
  return {
    agora: () => new Date(atual),
    vaiPara(novo: string) {
      atual = novo;
    },
  };
}

/**
 * Usuário criado por SQL cru, de propósito: a fixture não depende do módulo
 * `acesso`, senão um defeito lá derrubaria a montagem de todos os outros
 * testes. Sem senha; quem testa autenticação usa `registraUsuario`.
 */
export function insereUsuario(
  conexao: ConexaoRdo,
  nome: string,
  email: string,
  criadoEm: Instante = '2026-01-01T00:00:00.000Z',
): UsuarioId {
  const id = geraId<'usuario'>();
  conexao.sqlite
    .prepare(`INSERT INTO usuario (id, nome, email, criado_em) VALUES (?, ?, ?, ?)`)
    .run(id, nome, email, criadoEm);
  return id;
}
