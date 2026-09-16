/**
 * Configuração do `drizzle-kit`.
 *
 * O esquema é único, em `src/db/schema/`, e as migrations são **SQL
 * versionado** em `src/db/migrations/`: é o SQL que roda em produção e é ele
 * que se lê na revisão, não o TypeScript.
 *
 * Gerar: `npx drizzle-kit generate`.
 *
 * O caminho do banco vem da mesma variável de ambiente de `src/db/index.ts`.
 * Repetir a leitura aqui, em vez de importar, é deliberado: o `drizzle-kit`
 * carrega este arquivo fora do runtime da aplicação, e importar o módulo de
 * conexão abriria um banco só para ler uma string.
 */

import { defineConfig } from 'drizzle-kit';

const caminho = process.env['RDO_BANCO_CAMINHO']?.trim();

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: caminho === undefined || caminho === '' ? 'tmp/rdo.sqlite' : caminho,
  },
  strict: true,
  verbose: true,
});
