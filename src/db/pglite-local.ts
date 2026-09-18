/**
 * Banco local de desenvolvimento: Postgres em processo, em disco.
 *
 * ## Por que existe
 *
 * Antes de 17/09/2026 o banco era um arquivo SQLite e `npm run dev` bastava.
 * Depois da migração, subir a aplicação passou a exigir um Postgres — e sem uma
 * string do Neon na mão, `npm run dev` responde 500 em toda rota. Quem clona o
 * repositório não consegue nem ver a tela de entrar.
 *
 * Este arquivo devolve o `npm run dev` de volta, usando **o mesmo PGlite que os
 * testes já usam**: Postgres de verdade, compilado para WebAssembly, com as
 * mesmas migrations e as mesmas restrições. Não é um segundo dialeto, e por
 * isso não recria o problema que a migração resolveu.
 *
 * A diferença para o teste é que aqui os dados ficam **numa pasta**, e não em
 * memória: o dado semeado sobrevive ao reinício do servidor, que é o que faz a
 * demonstração ao cliente ser possível sem nuvem nenhuma.
 *
 * ## Onde ele NÃO entra
 *
 * Não é importado por `src/db/index.ts`, e sim carregado sob demanda por
 * `instrumentation.ts`. São duas razões, e as duas importam:
 *
 * 1. **produção não carrega isto.** O import é dinâmico e fica atrás de duas
 *    condições; o empacotador não puxa o WebAssembly de 3 MB para dentro de
 *    cada função serverless da Vercel;
 * 2. **produção não pode cair aqui por engano.** `criaConexaoLocal` recusa
 *    quando `NODE_ENV` é `production`. Um banco em WebAssembly dentro do
 *    processo, num ambiente onde o disco some a cada invocação, perderia dado
 *    de obra em silêncio — que é exatamente o defeito que tirou o SQLite.
 *
 * ## O que ele não resolve
 *
 * Um processo por vez. PGlite abre a pasta com exclusividade, então dois
 * `npm run dev` na mesma pasta não convivem. Em desenvolvimento é o caso comum;
 * se precisar de dois, aponte `RDO_BANCO_LOCAL` para pastas diferentes.
 */

import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import type { ConexaoRdo } from './index';
import * as schema from './schema';
import { semeiaTaxonomias } from './seed';

/*
 * Caminho a partir da raiz do projeto, e não de `import.meta.url`.
 *
 * O Turbopack lê `new URL('./x', import.meta.url)` como referência a um módulo
 * e falha no build com `Can't resolve './migrations'` — a pasta tem SQL, não
 * JavaScript. `process.cwd()` serve porque este arquivo só roda em
 * desenvolvimento, onde o servidor sempre sobe da raiz.
 */
const PASTA_DE_MIGRATIONS = join(process.cwd(), 'src', 'db', 'migrations');

/**
 * Pasta padrao: **fora da arvore do projeto**, no temporario do sistema.
 *
 * A primeira versao gravava em `tmp/banco-local`, dentro do repositorio, que
 * e o lugar obvio e estava errado. Esta copia do projeto mora dentro de uma
 * pasta do OneDrive, e um diretorio de dados do Postgres dentro de pasta
 * sincronizada e reescrito por baixo: o sincronizador abre, copia e devolve os
 * arquivos no seu ritmo, enquanto o banco espera ser o unico a escrever neles.
 * O resultado foi `failed to initialize` tres vezes numa tarde, e a explicacao
 * que eu tinha escrito -- "alguem encerrou a forca" -- era so a primeira
 * suspeita, nao a causa.
 *
 * Vale para OneDrive, Dropbox, Google Drive e pasta de rede. Nao e defeito do
 * PGlite: nenhum banco sobrevive a alguem mexendo nos seus arquivos.
 *
 * `RDO_BANCO_LOCAL=<caminho>` aponta para outro lugar, para quem quiser a
 * pasta junto do projeto e saiba que ela nao esta sincronizada.
 */
export const PASTA_PADRAO = join(tmpdir(), 'rdo-banco-local');

/**
 * Aplica as migrations lendo o SQL direto, como o apoio de teste faz.
 *
 * Idempotente pelo próprio SQL: o gerador escreve `CREATE TABLE IF NOT EXISTS`
 * e `DO $$ ... EXCEPTION WHEN duplicate_object` nas restrições, então reabrir
 * uma pasta já migrada não quebra. Um erro de objeto duplicado é engolido **de
 * propósito e só aqui** — em produção o migrator do Drizzle controla versão e
 * nada é engolido.
 */
async function aplicaMigrations(pg: PGlite): Promise<void> {
  const arquivos = readdirSync(PASTA_DE_MIGRATIONS)
    .filter((nome) => nome.endsWith('.sql'))
    .sort();

  for (const arquivo of arquivos) {
    const sql = readFileSync(join(PASTA_DE_MIGRATIONS, arquivo), 'utf8');
    for (const comando of sql.split('--> statement-breakpoint')) {
      const limpo = comando.trim();
      if (limpo === '') continue;
      try {
        await pg.exec(limpo);
      } catch (causa) {
        const mensagem = causa instanceof Error ? causa.message : String(causa);
        // `already exists` é reabrir a mesma pasta. Qualquer outro erro é
        // defeito de migration e precisa subir.
        if (!/already exists|duplicate/i.test(mensagem)) throw causa;
      }
    }
  }
}

export async function criaConexaoLocal(pasta = PASTA_PADRAO): Promise<ConexaoRdo> {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'O banco local é só para desenvolvimento. Em produção use DATABASE_URL, do Neon.',
    );
  }

  mkdirSync(pasta, { recursive: true });
  const pg = new PGlite(pasta);

  try {
    await aplicaMigrations(pg);
  } catch (causa) {
    /*
     * `PGlite failed to initialize properly` quer dizer pasta corrompida, e a
     * causa comum é encerrar o servidor à força: o Postgres não fecha, e o
     * diretório de dados fica no meio de uma escrita.
     *
     * A mensagem diz o que fazer em vez de despejar o rastro do WebAssembly,
     * que ocupa a tela inteira e não ajuda ninguém. **Não apaga sozinho**: a
     * pasta pode ter a demonstração que alguém vai apresentar daqui a uma hora,
     * e apagar dado por iniciativa própria não é conserto.
     */
    const mensagem = causa instanceof Error ? causa.message : String(causa);
    if (/failed to initialize/i.test(mensagem)) {
      throw new Error(
        `O banco local em "${pasta}" não abriu. Duas causas, nesta ordem de ` +
          'probabilidade: a pasta está dentro de um diretório sincronizado ' +
          '(OneDrive, Dropbox, Google Drive, unidade de rede), que reescreve os ' +
          'arquivos por baixo do banco; ou o servidor foi encerrado à força. ' +
          'Apague a pasta e rode de novo — ela só tem dado de desenvolvimento, e ' +
          '`npm run demonstracao` a repovoa.',
      );
    }
    throw causa;
  }

  const db = drizzle(pg, { schema });
  // As taxonomias são carga inicial, não dado de obra: 12 funções, 14 status,
  // 8 tipos de equipamento e 8 sugestões de motivo. `semeiaTaxonomias` é
  // idempotente, então reabrir a pasta não duplica nada.
  await semeiaTaxonomias(db, new Date().toISOString().replace(/\.\d+Z$/, '.000Z'));

  return {
    db,
    executa: async (comando: string, parametros: readonly unknown[] = []) => {
      if (parametros.length === 0) await pg.exec(comando);
      else await pg.query(comando, [...parametros]);
    },
    consulta: async <T>(comando: string, parametros: readonly unknown[] = []) => {
      const r = await pg.query(comando, [...parametros]);
      return r.rows as T[];
    },
    fecha: async () => {
      await pg.close();
    },
  };
}

/**
 * Liga o banco local quando `RDO_BANCO_LOCAL` está definida. Devolve `true` se
 * ligou.
 *
 * É o que `instrumentation.ts` faz pelo servidor, disponível para os scripts de
 * linha de comando — `db:seed`, `criar-engenheiro`, `demonstracao`. Sem isto,
 * cada um deles exigiria uma string do Neon para rodar contra o banco de
 * desenvolvimento que já está no disco.
 *
 * **Um processo por vez.** PGlite abre a pasta com exclusividade: pare o
 * `npm run dev` antes de semear, ou o segundo processo não abre a pasta.
 */
export async function ligaBancoLocalSeConfigurado(): Promise<boolean> {
  const pasta = process.env['RDO_BANCO_LOCAL'];
  if (pasta === undefined || pasta === '') return false;
  if (jaLigado()) return true;

  const { defineConexaoDoProcesso } = await import('./index');
  // Marca ANTES de abrir: abrir leva segundos, e um segundo `register` no meio
  // encontraria a marca ausente e abriria uma segunda conexão na mesma pasta.
  marcaLigado();
  const conexao = await criaConexaoLocal(pasta === '1' ? PASTA_PADRAO : pasta);
  defineConexaoDoProcesso(conexao);
  // Aqui dentro, e não em quem chama: assim o tratador de sinal é registrado
  // exatamente uma vez, junto com a conexão que ele fecha.
  fechaAoEncerrar(conexao);
  return true;
}

/*
 * Uma conexão local por processo, marcada em `globalThis`.
 *
 * O motivo apareceu do pior jeito: **criar o `.env.local` com o servidor no ar
 * derrubava o servidor.** O Next percebe a mudança, imprime `Reload env` e chama
 * `register` de novo; a segunda chamada abria uma segunda conexão na mesma
 * pasta, que o PGlite reserva para um só, e o processo morria com código 1.
 *
 * A marca vive em `globalThis` pela mesma razão que a conexão: o empacotador do
 * Next carrega o mesmo arquivo em mais de uma instância, e uma variável de
 * módulo não seria vista pela segunda.
 */
const CHAVE_DE_LIGADO = Symbol.for('rdo.banco-local-ligado');

type PortadorDeMarca = { [CHAVE_DE_LIGADO]?: true };

function jaLigado(): boolean {
  return (globalThis as PortadorDeMarca)[CHAVE_DE_LIGADO] === true;
}

function marcaLigado(): void {
  (globalThis as PortadorDeMarca)[CHAVE_DE_LIGADO] = true;
}

/**
 * Fecha o banco quando o processo receber um sinal de encerramento.
 *
 * Não é cortesia: é o que evita perder a pasta. PGlite grava num diretório de
 * dados, e um processo morto no meio de uma escrita deixa o diretório num
 * estado em que o Postgres não sobe mais — a próxima subida falha com
 * `failed to initialize`. Sem isto, todo Ctrl+C arriscava a demonstração que
 * alguém ia apresentar daqui a uma hora.
 *
 * `SIGKILL` continua fora de alcance, porque nenhum processo pode tratá-lo; é
 * por isso que `criaConexaoLocal` ainda explica como se recuperar.
 *
 * `once`, e não `on`: dois sinais seguidos fechariam a conexão duas vezes.
 *
 * Mora aqui, e não em `instrumentation.ts`, porque o Next compila aquele
 * arquivo também para o runtime de borda, onde `process.once` não existe — e o
 * build avisava a cada linha. Este módulo só é carregado por import dinâmico,
 * em Node.
 */
export function fechaAoEncerrar(conexao: ConexaoRdo): void {
  let fechando = false;
  const encerra = (codigo: number) => (): void => {
    if (fechando) return;
    fechando = true;
    void conexao.fecha().finally(() => process.exit(codigo));
  };
  process.once('SIGINT', encerra(130));
  process.once('SIGTERM', encerra(143));
  process.once('SIGHUP', encerra(129));
}
