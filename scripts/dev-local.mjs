/**
 * `npm run dev:local` — servidor de desenvolvimento com banco local.
 *
 * Existe porque `RDO_BANCO_LOCAL=1 next dev` é sintaxe POSIX, e o npm no
 * Windows roda os scripts por `cmd.exe`, onde ela não funciona. É o mesmo
 * motivo de `scripts/contexto.mjs`: um caminho só, igual nos três sistemas,
 * sem acrescentar dependência para uma linha de shell.
 *
 * Resolve o `next` pelo caminho do módulo e o executa com o mesmo Node que está
 * rodando. Nem `npx`, nem `shell: true`: no Windows `npx` é `npx.cmd`, e desde
 * a correção da CVE-2024-27980 o Node recusa executar `.cmd` direto.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const next = fileURLToPath(import.meta.resolve('next/dist/bin/next'));

const filho = spawn(process.execPath, [next, 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, RDO_BANCO_LOCAL: process.env.RDO_BANCO_LOCAL ?? '1' },
});

filho.on('exit', (codigo, sinal) => {
  // Repassa o código: quem chamou precisa saber se caiu.
  process.exit(sinal !== null ? 1 : (codigo ?? 0));
});
