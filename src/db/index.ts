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
  /**
   * Execução crua, para migration e para o teste de esquema.
   *
   * **Não use para consulta de domínio**: o que passa por aqui não tem tipo,
   * não tem marca de `DiaPuro` e não passa por borda nenhuma.
   */
  executa(sql: string, parametros?: readonly unknown[]): Promise<void>;
  /** Leitura crua. Mesmo aviso: é para teste de esquema, não para domínio. */
  consulta<T = Record<string, unknown>>(
    sql: string,
    parametros?: readonly unknown[],
  ): Promise<T[]>;
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
    executa: async (comando: string, parametros: readonly unknown[] = []) => {
      await pool.query(comando, [...parametros]);
    },
    consulta: async <T>(comando: string, parametros: readonly unknown[] = []) => {
      const r = await pool.query(comando, [...parametros]);
      return r.rows as T[];
    },
    fecha: async () => {
      await pool.end();
    },
  };
}

/**
 * A conexão vive em `globalThis`, e não numa variável de módulo.
 *
 * O motivo é concreto e custou uma tarde: o empacotador do Next **carrega o
 * mesmo arquivo em mais de uma instância**. `instrumentation.ts` roda no seu
 * próprio grafo de módulos, e a conexão que ele registrava ficava numa cópia de
 * `src/db/index.ts` que rota nenhuma enxergava — as rotas caíam em
 * `criaBanco()` e morriam com `DATABASE_URL não está definida`, apesar de o
 * banco local ter subido.
 *
 * O `Symbol.for` resolve porque o registro de símbolos é do processo, e não do
 * módulo. Também sobrevive à reavaliação de módulo do hot reload, que antes
 * abria uma conexão nova a cada arquivo salvo.
 */
const CHAVE_DA_CONEXAO = Symbol.for('rdo.conexao');

type PortadorDaConexao = { [CHAVE_DA_CONEXAO]?: ConexaoRdo | null };

function portador(): PortadorDaConexao {
  return globalThis as unknown as PortadorDaConexao;
}

/**
 * Conexão única do processo, aberta na primeira chamada.
 *
 * É preguiçosa de propósito: conectar no topo do módulo faria `import` ter
 * efeito colateral, e teste que só quer o esquema abriria conexão de rede.
 */
export function obtemConexao(): ConexaoRdo {
  const atual = portador()[CHAVE_DA_CONEXAO];
  if (atual != null) return atual;
  const nova = criaBanco();
  portador()[CHAVE_DA_CONEXAO] = nova;
  return nova;
}

export function obtemBanco(): BancoRdo {
  return obtemConexao().db;
}

export function defineConexaoDoProcesso(conexao: ConexaoRdo | null): void {
  portador()[CHAVE_DA_CONEXAO] = conexao;
}

export { schema };
