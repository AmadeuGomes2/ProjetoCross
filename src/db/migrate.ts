/**
 * Aplica as migrations no banco configurado por ambiente.
 *
 * Postgres desde 17/09/2026: a variável agora é `DATABASE_URL`, do Neon.
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

import { migrate } from 'drizzle-orm/neon-serverless/migrator';

import { criaBanco } from './index';

export const PASTA_DE_MIGRATIONS = fileURLToPath(
  new URL('./migrations', import.meta.url),
);

export async function aplicaMigrations(url?: string): Promise<void> {
  const conexao = url === undefined ? criaBanco() : criaBanco(url);
  try {
    // O migrator do Neon pede o `db`; o `ConexaoRdo` tipa o supertipo comum
    // com PGlite, então a conversão é aqui, no único ponto que conhece o driver.
    await migrate(conexao.db as never, { migrationsFolder: PASTA_DE_MIGRATIONS });
  } finally {
    await conexao.fecha();
  }
}

const esteArquivo = fileURLToPath(import.meta.url);

if (process.argv[1] === esteArquivo) {
  aplicaMigrations()
    .then(() => {
      // Saída em stderr: `console.log` é proibido pela regra do projeto.
      console.warn('Migrations aplicadas.');
    })
    .catch((causa: unknown) => {
      console.warn(
        'As migrations falharam. Confira DATABASE_URL e o acesso ao Neon.\n' +
          (causa instanceof Error ? causa.message : String(causa)),
      );
      process.exitCode = 1;
    });
}
