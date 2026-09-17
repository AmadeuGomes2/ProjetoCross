/**
 * Conexão com o banco.
 *
 * ## Por que deixou de ser SQLite, em 17/09/2026
 *
 * O banco era arquivo em disco, e **serverless não tem disco persistente**: na
 * Vercel cada invocação começa com o sistema de arquivos zerado, então a
 * aplicação não subia — não era lentidão nem configuração, era impossível. O
 * destino é o Neon, que é Postgres gerenciado.
 *
 * ## Dois drivers, um dialeto
 *
 * - **produção**: `@neondatabase/serverless` por WebSocket.
 *   **`neon-http` foi recusado** e o motivo é concreto: ele **não suporta
 *   transação** (`No transactions support in neon-http driver`), e o módulo
 *   `lancamento` depende de `executaEmTransacao` para que um lançamento
 *   recusado não deixe o dia criado para trás;
 * - **teste**: PGlite, que é o Postgres compilado para WebAssembly e roda dentro
 *   do processo. É Postgres de verdade — mesmo dialeto, mesmas restrições,
 *   mesmas migrations —, sem servidor para subir. O teste passa a provar o que
 *   roda em produção, que é o que um banco em memória de outro dialeto não faz.
 *
 * O que **não** muda para quem chama: o tipo `BancoRdo` continua sendo o
 * `drizzle` com o mesmo esquema, e `DiaPuro` continua sendo `AAAA-MM-DD`.
 *
 * ## O que sumiu, e o que ficou no lugar
 *
 * Os PRAGMAs do SQLite não existem aqui, e nem precisam: no Postgres a chave
 * estrangeira é sempre verificada — não há o `foreign_keys = OFF` silencioso
 * que fazia todo `RESTRICT` do esquema virar decoração.
 */

import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import ws from 'ws';

import * as schema from './schema';

export const VARIAVEL_DE_CONEXAO = 'DATABASE_URL';

/**
 * O supertipo comum de Neon e PGlite.
 *
 * Os dois drivers estendem `PgDatabase`, e é por aqui que o teste roda contra
 * **o mesmo dialeto** da produção. Amarrar o tipo a `NeonDatabase` obrigaria o
 * teste a mentir sobre o que usa.
 */
export type BancoRdo = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface ConexaoRdo {
  readonly db: BancoRdo;
  /** Execução crua, para migration. Não use para consulta de domínio. */
  executa(sql: string): Promise<void>;
  fecha(): Promise<void>;
}

export function urlDoBanco(ambiente: NodeJS.ProcessEnv = process.env): string {
  const bruto = ambiente[VARIAVEL_DE_CONEXAO]?.trim();
  if (bruto === undefined || bruto === '') {
    throw new Error(
      `${VARIAVEL_DE_CONEXAO} não está definida. Copie \`.env.example\` para ` +
        '`.env.local` e preencha com a string de conexão do Neon.',
    );
  }
  return bruto;
}

/**
 * Conexão de produção, contra o Neon.
 *
 * O `Pool` é do `@neondatabase/serverless` e fala WebSocket; em Node ele precisa
 * de uma implementação de WebSocket, que o `ws` fornece. No runtime de borda da
 * Vercel o WebSocket é nativo e esta linha não faz nada.
 */
export function criaBanco(url: string = urlDoBanco()): ConexaoRdo {
  // Em Node não existe `WebSocket` global; o `ws` entra no lugar. A atribuição
  // é idempotente e barata, então não vale um `if` que esconde o motivo.
  neonConfig.webSocketConstructor = ws;

  const pool = new Pool({ connectionString: url });
  return {
    db: drizzleNeon(pool, { schema }),
    executa: async (comando: string) => {
      await pool.query(comando);
    },
    fecha: async () => {
      await pool.end();
    },
  };
}

let conexaoDoProcesso: ConexaoRdo | null = null;

/**
 * Conexão única do processo, aberta na primeira chamada.
 *
 * É preguiçosa de propósito: conectar no topo do módulo faria `import` ter
 * efeito colateral, e teste que só quer o esquema abriria conexão de rede.
 */
export function obtemConexao(): ConexaoRdo {
  conexaoDoProcesso ??= criaBanco();
  return conexaoDoProcesso;
}

export function obtemBanco(): BancoRdo {
  return obtemConexao().db;
}

export function defineConexaoDoProcesso(conexao: ConexaoRdo | null): void {
  conexaoDoProcesso = conexao;
}

export { schema };
