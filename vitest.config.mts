import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    globals: false,

    /*
     * Os prazos existem por causa do PGlite.
     *
     * Desde a migração para Postgres, de 17/09/2026, cada arquivo de teste
     * levanta um Postgres compilado para WebAssembly e aplica as migrations —
     * 22 tabelas e 230 restrições. Sozinho isso leva uns 2 s; com o Vitest
     * rodando vários arquivos em paralelo, passa dos 10 s padrão e o
     * `beforeEach` morre por prazo.
     *
     * Foi exatamente o que aconteceu na primeira execução da suíte inteira: 18
     * arquivos vermelhos, todos com `Hook timed out in 10000ms`, e **todos
     * verdes quando rodados sozinhos**. Prazo curto não denuncia lentidão, ele
     * produz falha que parece defeito de lógica.
     *
     * O número é folgado de propósito: prazo de teste existe para impedir que
     * um travamento pendure a suíte para sempre, não para medir desempenho.
     */
    testTimeout: 60_000,
    hookTimeout: 60_000,

    /*
     * Cada processo carrega o seu Postgres em WebAssembly, que custa memória de
     * verdade. Sem teto, o Vitest abre um por núcleo e a máquina passa a
     * trocar memória com o disco — o que aparece como prazo esgotado, e não
     * como falta de memória.
     */
    poolOptions: {
      threads: { maxThreads: 4 },
      forks: { maxForks: 4 },
    },
  },
});
