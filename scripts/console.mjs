/**
 * Varre as rotas e reporta o que o console do navegador reclamar.
 *
 * Companheiro do `telas.mjs`: aquele mostra o que a tela PARECE, este mostra o
 * que ela RECLAMA. Existe porque em 17/09/2026 apareceu um erro de hidratação
 * que era de extensão de navegador, e distinguir "erro da extensão" de "erro
 * nosso" exigia um lugar limpo para comparar.
 *
 * O Chromium do Playwright não tem extensão nenhuma instalada, e é justamente
 * isso que dá valor à varredura: o que sobra aqui é da aplicação.
 *
 * Uso:
 *   npm run console                    só hidratação, que é o caso comum
 *   npm run console -- --tudo          todo erro e aviso do console
 *
 * Precisa do servidor no ar (`npm run dev`).
 */
import { chromium } from 'playwright';

import { descobreContexto } from './contexto.mjs';

const BASE = process.env.RDO_BASE ?? 'http://localhost:3000';
const TUDO = process.argv.includes('--tudo');

/** O que conta como erro de hidratação, nas duas línguas do React. */
const DE_HIDRATACAO = /hydrat|hidrat|did not match|server rendered HTML/i;

/**
 * Ruído conhecido do modo de desenvolvimento, que não é defeito da aplicação.
 * Fica explícito aqui para que ninguém o confunda com achado.
 */
const RUIDO = [/Download the React DevTools/i, /\[Fast Refresh\]/i];

async function main() {
  const ctx = descobreContexto();

  const rotas = [
    ['/', null],
    ['/entrar', null],
    ['/obras', 'eng'],
    [`/obras/${ctx.obra}`, 'eng'],
    [`/obras/${ctx.obra}/pessoal`, 'eng'],
    [`/obras/${ctx.obra}/nao-existe-esta-rota`, 'eng'],
    [`/rdo/${ctx.obra}/${ctx.dia}`, 'eng'],
    [`/lancamento/${ctx.obra}/${ctx.dia}`, 'enc'],
    [`/lancamento/${ctx.obra}/${ctx.dia}/dia`, 'enc'],
    [`/lancamento/${ctx.obra}/${ctx.dia}/atividades`, 'enc'],
    [`/lancamento/${ctx.obra}/${ctx.dia}/producao`, 'enc'],
    [`/lancamento/${ctx.obra}/${ctx.dia}/observacoes`, 'enc'],
  ];

  const navegador = await chromium.launch();
  let problemas = 0;

  for (const [rota, perfil] of rotas) {
    const contexto = await navegador.newContext({
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });
    if (perfil !== null) {
      await contexto.addCookies([
        { name: 'rdo_sessao', value: ctx[perfil], domain: 'localhost', path: '/' },
      ]);
    }

    const pagina = await contexto.newPage();
    const recados = [];
    pagina.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') recados.push(m.text());
    });
    pagina.on('pageerror', (e) => recados.push('EXCECAO: ' + e.message));

    try {
      await pagina.goto(BASE + rota, { waitUntil: 'networkidle', timeout: 25000 });
      // Dá tempo de a hidratação acontecer e reclamar, se for reclamar.
      await pagina.waitForTimeout(1200);
    } catch (e) {
      recados.push('NAVEGACAO: ' + e.message.split('\n')[0]);
    }

    const achados = recados
      .filter((r) => !RUIDO.some((p) => p.test(r)))
      .filter((r) => TUDO || DE_HIDRATACAO.test(r) || r.startsWith('EXCECAO'));

    // A URL leva o id da obra; encurta para o relatório não virar parede.
    const curta = rota.replace(ctx.obra, '<obra>');
    if (achados.length > 0) {
      problemas += achados.length;
      console.warn(`FALHOU ${curta}`);
      for (const r of achados) console.warn('   ' + r.split('\n')[0].slice(0, 200));
    } else {
      console.warn(`ok     ${curta}`);
    }
    await contexto.close();
  }

  await navegador.close();
  console.warn(
    problemas === 0
      ? `\nNada a reportar em ${rotas.length} rotas.`
      : `\n${problemas} achado(s).`,
  );
  // Sai diferente de zero para poder virar portão de verificação um dia.
  if (problemas > 0) process.exitCode = 1;
}

await main();
