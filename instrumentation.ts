/**
 * Roda na subida do servidor, antes da primeira requisição.
 *
 * Aqui existe por um motivo só: ligar o **banco local de desenvolvimento**
 * quando `RDO_BANCO_LOCAL` está definida. Sem isso, depois da migração para
 * Postgres, `npm run dev` sem uma string do Neon responde 500 em toda rota.
 *
 * O import é dinâmico e condicionado. Em produção a condição é falsa, o módulo
 * não é carregado, e o Postgres em WebAssembly não entra no pacote da Vercel.
 *
 * Só o runtime `nodejs` entra: no runtime de borda não há sistema de arquivos,
 * e a verificação evita uma falha obscura na subida.
 *
 * ## `register` roda MAIS DE UMA VEZ
 *
 * O Next o chama de novo a cada `Reload env` — criar ou editar `.env.local` com
 * o servidor no ar basta. A primeira versão abria uma conexão PGlite nova a cada
 * chamada, na mesma pasta, e o PGlite reserva a pasta para um processo só: **o
 * servidor morria com código 1 no instante em que alguém salvava o arquivo.**
 *
 * `ligaBancoLocalSeConfigurado` é idempotente — guarda a marca em `globalThis`,
 * e não numa variável de módulo, porque o empacotador do Next carrega o mesmo
 * arquivo em mais de uma instância.
 */

export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return;

  const { ligaBancoLocalSeConfigurado, fechaAoEncerrar } =
    await import('./src/db/pglite-local');

  const ligou = await ligaBancoLocalSeConfigurado();
  if (!ligou) return;

  const { obtemConexao } = await import('./src/db/index');
  // O tratamento de sinal mora no módulo importado sob demanda, e não aqui: o
  // Next compila este arquivo para os dois runtimes, e `process.once` não existe
  // no de borda. O guia manda importar condicionalmente o que não roda em todo
  // lugar, e é o que este arquivo faz.
  fechaAoEncerrar(obtemConexao());

  // `console.log` é proibido pela regra do projeto; aviso vai em stderr.
  console.warn(
    `[rdo] banco local de desenvolvimento em ${process.env['RDO_BANCO_LOCAL']}`,
  );
}
