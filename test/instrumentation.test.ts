/**
 * `instrumentation.ts` não pode carregar o PGlite em produção.
 *
 * ## O defeito que este arquivo tranca
 *
 * `register` roda na subida de **toda** instância do servidor, inclusive na
 * Vercel. O módulo `src/db/pglite-local` carrega um Postgres compilado para
 * WebAssembly, de alguns megabytes, que só serve ao desenvolvimento local. Ele
 * fica atrás de um `import` dinâmico justamente para não ser carregado lá.
 *
 * Numa arrumação de 17/09/2026 a checagem de `RDO_BANCO_LOCAL` foi movida para
 * dentro da função importada. Parecia melhor — uma condição em vez de duas — e
 * **passou a carregar o PGlite em produção**, porque o `import` deixou de estar
 * atrás da condição. Se esse carregamento falha no ambiente serverless,
 * `register` estoura, o servidor não sobe, e **toda rota responde 500**. Foi o
 * que aconteceu no primeiro deploy.
 *
 * ## Por que o teste lê o texto do arquivo
 *
 * O que se quer garantir é uma propriedade de **ordem entre guarda e import**,
 * e ela não é observável chamando `register`: num teste, o PGlite carrega sem
 * reclamar, então a versão errada passaria verde. O mesmo motivo faz
 * `rotas-protegidas.test.ts` varrer a superfície de servidor lendo arquivo.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const FONTE = readFileSync(join(process.cwd(), 'instrumentation.ts'), 'utf8');

/** O corpo de `register`, sem o comentário do topo. */
const CORPO = FONTE.slice(FONTE.indexOf('export async function register'));

describe('a guarda de `instrumentation.ts`', () => {
  it('verifica RDO_BANCO_LOCAL antes de importar o banco local', () => {
    const guarda = CORPO.indexOf('RDO_BANCO_LOCAL');
    const importa = CORPO.indexOf("import('./src/db/pglite-local')");

    expect(guarda).toBeGreaterThanOrEqual(0);
    expect(importa).toBeGreaterThanOrEqual(0);
    // A ordem é o contrato: import depois da guarda, sempre.
    expect(guarda).toBeLessThan(importa);
  });

  it('sai cedo quando a variável não está definida', () => {
    // Um `return` entre a leitura da variável e o import. Sem ele, a guarda
    // seria decorativa.
    const entreGuardaEImport = CORPO.slice(
      CORPO.indexOf('RDO_BANCO_LOCAL'),
      CORPO.indexOf("import('./src/db/pglite-local')"),
    );
    expect(entreGuardaEImport).toMatch(/\breturn\b/);
  });

  it('o import do banco local é dinâmico, nunca no topo do arquivo', () => {
    // `import ... from './src/db/pglite-local'` no topo carregaria o PGlite em
    // todo ambiente, e guarda nenhuma salvaria.
    expect(FONTE).not.toMatch(/^import .*pglite-local/m);
  });

  it('não roda no runtime de borda, onde não há sistema de arquivos', () => {
    const guardaDeRuntime = CORPO.indexOf('NEXT_RUNTIME');
    const importa = CORPO.indexOf("import('./src/db/pglite-local')");
    expect(guardaDeRuntime).toBeGreaterThanOrEqual(0);
    expect(guardaDeRuntime).toBeLessThan(importa);
  });
});
