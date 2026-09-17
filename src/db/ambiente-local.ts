/**
 * Carrega `.env.local` para os comandos de linha de comando.
 *
 * ## Por que existe
 *
 * `next dev` e `next build` leem `.env.local` sozinhos. **`tsx` não.** Então
 * `npm run db:migrate`, `npm run db:seed`, `npm run criar-engenheiro` e
 * `npm run demonstracao` subiam sem `DATABASE_URL` mesmo com o arquivo
 * preenchido — e a mensagem de erro do projeto mandava, ela mesma, preencher
 * `.env.local`. O conselho levava a lugar nenhum.
 *
 * A alternativa era `DATABASE_URL="..." npm run db:migrate`, que é sintaxe
 * POSIX: no Windows, onde o npm roda os scripts por `cmd.exe`, ela não funciona.
 * Mesma família do defeito que quebrava `npm run telas`.
 *
 * ## Por que `@next/env`, e não um leitor próprio
 *
 * É **o mesmo carregador que o `next dev` usa**. Com ele, o arquivo que vale
 * para a aplicação vale igual para os comandos — mesma ordem de precedência,
 * mesmo tratamento de aspas e de comentário. Um leitor escrito à mão acertaria
 * o caso comum e divergiria em algum canto, e divergir aqui significa o comando
 * conectar num banco diferente do que a aplicação conecta.
 *
 * Está declarado em `package.json` de propósito: vinha junto do `next` como
 * dependência transitiva, e depender de transitiva é depender do que ninguém
 * prometeu manter.
 */

import { loadEnvConfig } from '@next/env';

let carregado = false;

/**
 * Idempotente: chamar duas vezes não relê nem sobrescreve o que já está no
 * ambiente. Variável definida no shell continua ganhando do arquivo, que é a
 * precedência do Next e a que não surpreende ninguém.
 */
export function carregaAmbienteLocal(): void {
  if (carregado) return;
  carregado = true;
  // `dev = true` faz valer `.env.local`, que é o arquivo de quem desenvolve.
  // Em produção nada disto roda: a Vercel injeta as variáveis direto.
  loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });
}
