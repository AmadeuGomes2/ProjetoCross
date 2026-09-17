/**
 * Roda uma vez, na subida do servidor, antes da primeira requisição.
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
 */

export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return;

  const pasta = process.env['RDO_BANCO_LOCAL'];
  if (pasta === undefined || pasta === '') return;

  const { defineConexaoDoProcesso } = await import('./src/db/index');
  const { criaConexaoLocal, PASTA_PADRAO } = await import('./src/db/pglite-local');

  const conexao = await criaConexaoLocal(pasta === '1' ? PASTA_PADRAO : pasta);
  defineConexaoDoProcesso(conexao);

  /*
   * Fechar o banco ao encerrar não é cortesia: é o que evita perder a pasta.
   *
   * PGlite grava num diretório de dados, e um processo morto no meio de uma
   * escrita deixa o diretório num estado em que o Postgres não sobe mais — a
   * próxima subida falha com `failed to initialize`. Sem isto, todo Ctrl+C
   * arriscava a demonstração que alguém ia apresentar.
   *
   * `SIGKILL` continua fora de alcance, porque nenhum processo pode tratá-lo;
   * é por isso que `criaConexaoLocal` ainda explica como se recuperar.
   *
   * `once`, e não `on`: dois sinais seguidos fechariam a conexão duas vezes.
   */
  let fechando = false;
  const encerra = (codigo: number) => (): void => {
    if (fechando) return;
    fechando = true;
    void conexao.fecha().finally(() => process.exit(codigo));
  };
  process.once('SIGINT', encerra(130));
  process.once('SIGTERM', encerra(143));
  process.once('SIGHUP', encerra(129));

  // `console.log` é proibido pela regra do projeto; aviso vai em stderr.
  console.warn(`[rdo] banco local de desenvolvimento em ${pasta}`);
}
