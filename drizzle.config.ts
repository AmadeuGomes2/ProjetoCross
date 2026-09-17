/**
 * Configuração do `drizzle-kit`.
 *
 * **Postgres desde 17/09/2026.** O banco era SQLite em arquivo, e serverless não
 * tem disco persistente: a aplicação não subia na Vercel. O destino é o Neon.
 * As migrations do SQLite estão preservadas em `docs/historico/`.
 *
 * O esquema é único, em `src/db/schema/`, e as migrations são **SQL
 * versionado** em `src/db/migrations/`: é o SQL que roda em produção e é ele
 * que se lê na revisão, não o TypeScript.
 *
 * Gerar: `npx drizzle-kit generate`.
 *
 * A string de conexão vem da mesma variável de ambiente de `src/db/index.ts`.
 * Repetir a leitura aqui, em vez de importar, é deliberado: o `drizzle-kit`
 * carrega este arquivo fora do runtime da aplicação, e importar o módulo de
 * conexão abriria uma conexão de rede só para ler uma string.
 */

import { defineConfig } from 'drizzle-kit';

const url = process.env['DATABASE_URL']?.trim();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    // Só `generate` roda sem banco; `push` e `studio` exigem a conexão real.
    url: url === undefined || url === '' ? 'postgres://localhost:5432/rdo' : url,
  },
  strict: true,
  verbose: true,
});
