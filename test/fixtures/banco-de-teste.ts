/**
 * Apoio de teste: Postgres em processo, migrations aplicadas, taxonomias semeadas.
 *
 * Só dado sintético (CLAUDE.md, Segurança). Nenhum nome daqui é de pessoa real.
 *
 * ## Por que PGlite, e não um banco em memória de outro dialeto
 *
 * Desde 17/09/2026 a produção é Postgres, no Neon. PGlite é **o Postgres de
 * verdade**, compilado para WebAssembly, rodando dentro do processo: mesmo
 * dialeto, mesmas restrições, as mesmas migrations. O teste passa a provar o
 * que roda em produção.
 *
 * A alternativa — manter o teste em SQLite — foi recusada: dois dialetos fazem
 * o teste verde sobre um `CHECK` que o banco de produção nem entende, e é onde
 * nascem os defeitos que só aparecem no ar.
 *
 * Não toca o sistema de arquivos, e o relógio é sempre injetado
 * (padroes-codigo, Testes: "nada de rede, relógio real nem sistema de arquivos").
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import { type ConexaoRdo } from '../../src/db';
import * as schema from '../../src/db/schema';
import { semeiaTaxonomias } from '../../src/db/seed';
import type { Instante } from '../../src/shared/date/fuso';
import { geraId, type UsuarioId } from '../../src/shared/id';

const PASTA_DE_MIGRATIONS = fileURLToPath(
  new URL('../../src/db/migrations', import.meta.url),
);

/**
 * Aplica as migrations lendo o SQL direto.
 *
 * O migrator do Drizzle grava a tabela de controle e exige o journal; aqui o
 * banco nasce e morre com o teste, então controlar versão seria cerimônia sem
 * ninguém para ler. O `statement-breakpoint` é a separação que o próprio
 * `drizzle-kit` escreve.
 */
async function aplicaMigrations(pg: PGlite): Promise<void> {
  const arquivos = readdirSync(PASTA_DE_MIGRATIONS)
    .filter((nome) => nome.endsWith('.sql'))
    .sort();

  for (const arquivo of arquivos) {
    const sql = readFileSync(join(PASTA_DE_MIGRATIONS, arquivo), 'utf8');
    for (const comando of sql.split('--> statement-breakpoint')) {
      const limpo = comando.trim();
      if (limpo !== '') await pg.exec(limpo);
    }
  }
}

export async function criaBancoDeTeste(): Promise<ConexaoRdo> {
  const pg = new PGlite();
  await aplicaMigrations(pg);

  const db = drizzle(pg, { schema });
  const conexao: ConexaoRdo = {
    db,
    executa: async (comando: string) => {
      await pg.exec(comando);
    },
    fecha: async () => {
      await pg.close();
    },
  };

  await semeiaTaxonomias(db, '2026-01-01T00:00:00.000Z');
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
 *
 * `eEngenheiro` reproduz o que **só** o comando de instalação faz: ligar a
 * coluna `e_engenheiro` da conta. O padrão é desligado, que é o de toda conta
 * nascida na web — não há cadastro público, e convite só cria encarregado.
 */
export async function insereUsuario(
  conexao: ConexaoRdo,
  nome: string,
  email: string,
  opcoes: { readonly criadoEm?: Instante; readonly eEngenheiro?: boolean } = {},
): Promise<UsuarioId> {
  const id = geraId<'usuario'>();
  await conexao.db.insert(schema.usuario).values({
    id,
    nome,
    email,
    criadoEm: opcoes.criadoEm ?? '2026-01-01T00:00:00.000Z',
    eEngenheiro: opcoes.eEngenheiro === true ? 1 : 0,
  });
  return id;
}
