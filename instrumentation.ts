/**
 * Roda na subida do servidor, antes da primeira requisição.
 *
 * Aqui existe por um motivo só: ligar o **banco local de desenvolvimento**
 * quando `RDO_BANCO_LOCAL` está definida. Sem isso, depois da migração para
 * Postgres, `npm run dev` sem uma string do Neon responde 500 em toda rota.
 *
 * ## A ordem das duas guardas é o contrato deste arquivo
 *
 * As duas verificações acontecem **antes de qualquer `import`**, e isso não é
 * estilo:
 *
 * - `NEXT_RUNTIME`, porque no runtime de borda não há sistema de arquivos;
 * - `RDO_BANCO_LOCAL`, porque `./src/db/pglite-local` carrega um **Postgres
 *   compilado para WebAssembly**, de alguns megabytes. Em produção ele não
 *   serve para nada, e o `import` dinâmico só evita esse peso enquanto estiver
 *   atrás da condição.
 *
 * Uma versão anterior moveu a checagem de `RDO_BANCO_LOCAL` para dentro da
 * função importada, o que parecia arrumação e **passou a carregar o PGlite em
 * produção**. Se esse carregamento falhar no ambiente serverless, `register`
 * estoura, o servidor não sobe e toda rota responde 500. `instrumentation.test.ts`
 * existe para que isso não volte.
 *
 * ## `register` roda MAIS DE UMA VEZ
 *
 * O Next o chama de novo a cada `Reload env` — criar ou editar `.env.local` com
 * o servidor no ar basta. Por isso `ligaBancoLocalSeConfigurado` é idempotente:
 * a versão anterior abria uma conexão PGlite nova a cada chamada, na mesma
 * pasta, e o PGlite reserva a pasta para um processo só.
 */

export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return;

  const pasta = process.env['RDO_BANCO_LOCAL'];
  if (pasta === undefined || pasta === '') return;

  // Só aqui, do lado de dentro das duas guardas.
  const { ligaBancoLocalSeConfigurado } = await import('./src/db/pglite-local');
  await ligaBancoLocalSeConfigurado();

  // `console.log` é proibido pela regra do projeto; aviso vai em stderr.
  console.warn(`[rdo] banco local de desenvolvimento em ${pasta}`);
}
