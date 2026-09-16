/**
 * Conexão com o banco.
 *
 * docs/arquitetura/v1.md, seção 0: os PRAGMAs desta função valem para produção
 * e para teste de integração, porque o better-sqlite3 não faz nada disto
 * sozinho.
 *
 * **`PRAGMA foreign_keys = ON` é o item que não pode faltar.** Sem ele o SQLite
 * ignora chave estrangeira em silêncio, e todo o RESTRICT do esquema — que é o
 * que impede apagar uma obra e levar junto o histórico de RDO — vira
 * decoração. Por isso ele é ligado aqui, em UMA função, e não em quem chama.
 */

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema';

export const VARIAVEL_DE_CAMINHO = 'RDO_BANCO_CAMINHO';

/**
 * Padrão local. Fica em `tmp/`, que o `.gitignore` já bloqueia: banco de
 * desenvolvimento tem dado de obra e dado pessoal, e não se versiona
 * (CLAUDE.md, Segurança).
 */
export const CAMINHO_PADRAO = 'tmp/rdo.sqlite';

/** Banco em memória, para teste. Não toca o sistema de arquivos. */
export const EM_MEMORIA = ':memory:';

export function caminhoDoBanco(ambiente: NodeJS.ProcessEnv = process.env): string {
  const bruto = ambiente[VARIAVEL_DE_CAMINHO]?.trim();
  return bruto === undefined || bruto === '' ? CAMINHO_PADRAO : bruto;
}

export type BancoRdo = BetterSQLite3Database<typeof schema>;

export interface ConexaoRdo {
  readonly db: BancoRdo;
  /** Acesso cru, para migration e para PRAGMA. Não use para consulta de domínio. */
  readonly sqlite: Database.Database;
  fecha(): void;
}

export function criaBanco(caminho: string = caminhoDoBanco()): ConexaoRdo {
  const emMemoria = caminho === EM_MEMORIA;
  if (!emMemoria) {
    mkdirSync(dirname(caminho), { recursive: true });
  }

  const sqlite = new Database(caminho);

  // A ordem importa: `foreign_keys` precisa estar ligado antes de qualquer
  // transação, e não pode ser alterado dentro de uma.
  sqlite.pragma('foreign_keys = ON');
  if (!emMemoria) {
    // WAL não se aplica a banco em memória e ali só produziria ruído.
    sqlite.pragma('journal_mode = WAL');
  }
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = NORMAL');

  return {
    db: drizzle(sqlite, { schema }),
    sqlite,
    fecha: () => sqlite.close(),
  };
}

let conexaoDoProcesso: ConexaoRdo | null = null;

/**
 * Conexão única do processo, aberta na primeira chamada.
 *
 * É preguiçosa de propósito: abrir arquivo no topo do módulo faria `import`
 * ter efeito colateral, e teste que só quer o esquema criaria banco em disco.
 */
export function obtemConexao(): ConexaoRdo {
  conexaoDoProcesso ??= criaBanco();
  return conexaoDoProcesso;
}

export function obtemBanco(): BancoRdo {
  return obtemConexao().db;
}

export { schema };
