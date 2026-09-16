/**
 * Aplica as migrations no banco configurado por ambiente.
 *
 * `npm run db:migrate`, e também o primeiro passo de `npm run db:preparar`.
 *
 * Por que existe um arquivo só para isto: o teste do esquema aplica as
 * migrations num banco em memória, e sem este ponto de entrada o banco de
 * verdade nunca receberia as tabelas. Foi exatamente o que aconteceu na
 * primeira tentativa de rodar o seed: o arquivo era criado vazio e a carga
 * falhava com "no such table".
 *
 * É idempotente: o Drizzle guarda em `__drizzle_migrations` o que já aplicou.
 */

import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { criaBanco } from './index';

export const PASTA_DE_MIGRATIONS = fileURLToPath(
  new URL('./migrations', import.meta.url),
);

export function aplicaMigrations(caminho?: string): void {
  const conexao = caminho === undefined ? criaBanco() : criaBanco(caminho);
  try {
    migrate(conexao.db, { migrationsFolder: PASTA_DE_MIGRATIONS });
  } finally {
    conexao.fecha();
  }
}

const esteArquivo = fileURLToPath(import.meta.url);

if (process.argv[1] === esteArquivo) {
  aplicaMigrations();
  // Saída em stderr: `console.log` é proibido pela regra do projeto.
  console.warn('Migrations aplicadas.');
}
