/**
 * Descobre o contexto de captura sem depender do shell.
 *
 * Existia como plumbing de linha de comando —
 * `tsx ... | grep ... > arquivo && env $(cat arquivo) node ...` — e isso é
 * sintaxe POSIX. O npm no Windows roda os scripts por `cmd.exe`, onde
 * `$(cat …)` não existe: `npm run telas` falhava com
 * `env: '$(cat': No such file or directory`. Só funcionava quando alguém
 * rodava as duas partes à mão, num bash.
 *
 * Agora o próprio Node chama a descoberta e lê a saída. Um caminho só, igual
 * nos três sistemas.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Roda `scripts/contexto-de-telas.ts` e devolve o objeto de contexto.
 *
 * A descoberta imprime `RDO_CONTEXTO={...}` no stderr; aqui só se procura essa
 * linha. Se ela não vier, o erro diz o que rodar, em vez de estourar num
 * `JSON.parse` de string vazia.
 */
export function descobreContexto() {
  /*
   * Chama o `tsx` pelo caminho do módulo, com o mesmo Node que está rodando.
   *
   * Nem `npx`, nem `shell: true`. No Windows, `npx` é `npx.cmd`, e desde a
   * correção da CVE-2024-27980 o Node recusa executar `.cmd` direto: o spawn
   * devolve `EINVAL` e nenhuma saída. A saída óbvia, `shell: true`, funciona
   * mas concatena argumentos sem escapar — o próprio Node avisa (DEP0190).
   * Resolver o módulo evita os dois problemas e não depende de PATH.
   */
  const tsx = fileURLToPath(import.meta.resolve('tsx/cli'));
  const executado = spawnSync(process.execPath, [tsx, 'scripts/contexto-de-telas.ts'], {
    encoding: 'utf8',
  });

  const saida = `${executado.stdout ?? ''}${executado.stderr ?? ''}`;
  const linha = saida.split('\n').find((l) => l.includes('RDO_CONTEXTO='));

  if (linha === undefined) {
    console.warn('Não consegui descobrir o contexto. O que a descoberta disse:\n');
    // O erro de spawn precisa aparecer: sem ele, uma falha de EXECUÇÃO se
    // disfarça de banco vazio, e procura-se o problema no lugar errado.
    if (executado.error !== undefined)
      console.warn(`  spawn: ${executado.error.message}`);
    console.warn(saida.trim() || '  (a descoberta não imprimiu nada)');
    console.warn('\nO banco local precisa de obra e das duas contas de demonstração.');
    process.exit(1);
  }

  return JSON.parse(linha.slice(linha.indexOf('RDO_CONTEXTO=') + 'RDO_CONTEXTO='.length));
}
