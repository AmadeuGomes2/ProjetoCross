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
  const { criaConexaoLocal, fechaAoEncerrar, PASTA_PADRAO } =
    await import('./src/db/pglite-local');

  const conexao = await criaConexaoLocal(pasta === '1' ? PASTA_PADRAO : pasta);
  defineConexaoDoProcesso(conexao);
  // O tratamento de sinal mora no módulo importado sob demanda, e não aqui: o
  // Next compila `instrumentation.ts` para os dois runtimes, e `process.once`
  // não existe no de borda. O guia manda importar condicionalmente o que não
  // roda em todo lugar, e é o que este arquivo faz.
  fechaAoEncerrar(conexao);

  // `console.log` é proibido pela regra do projeto; aviso vai em stderr.
  console.warn(`[rdo] banco local de desenvolvimento em ${pasta}`);
}
