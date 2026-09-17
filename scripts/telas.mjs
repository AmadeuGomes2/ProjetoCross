/**
 * Captura as telas da aplicação, para que se possa OLHAR para elas.
 *
 * Existe porque durante todo o desenvolvimento ninguém neste projeto viu uma
 * tela: o trabalho de layout foi feito lendo HTML e CSS, e isso custou duas
 * rodadas de correção. Ler marcação não diz se a hierarquia funciona, se o
 * contraste sustenta, nem se a página parece abandonada num monitor largo.
 *
 * Uso:
 *   node scripts/telas.mjs                    captura tudo
 *   node scripts/telas.mjs --rotulo antes     prefixa os arquivos
 *   node scripts/telas.mjs --so rdo,obra      captura só o que casar
 *   node scripts/telas.mjs --tema escuro      captura no tema escuro
 *
 * Precisa do servidor no ar (`npm run dev`) e de contas no banco. As imagens
 * vão para `tmp/telas/`, que o `.gitignore` bloqueia: captura de tela de obra
 * real mostra nome de trabalhador, e isso é dado pessoal sob a LGPD
 * (CLAUDE.md, Segurança).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

import { descobreContexto } from './contexto.mjs';

const BASE = process.env.RDO_BASE ?? 'http://localhost:3000';
const SAIDA = 'tmp/telas';

const argv = process.argv.slice(2);
const opcao = (nome) => {
  const i = argv.indexOf(nome);
  return i === -1 ? null : argv[i + 1];
};
const rotulo = opcao('--rotulo');
const filtro = opcao('--so');
/*
 * O tema escuro existe desde a folha de estilo global e nunca foi olhado.
 * `color-scheme: light dark` faz dele o padrão de quem usa o aparelho no
 * escuro — que é metade do canteiro no fim do dia.
 */
const tema = opcao('--tema') === 'escuro' ? 'dark' : 'light';

/** Larguras que importam: o celular do encarregado e o monitor do engenheiro. */
const APARELHOS = [
  ['celular', 390, 844],
  ['tablet', 820, 1180],
  ['monitor', 1440, 900],
];

/**
 * As telas, com o perfil que as alcança. O encarregado não abre cadastro:
 * capturar com a conta errada fotografa a tela de recusa, não a tela.
 */
export const TELAS = [
  ['01-entrada', '/', 'publico'],
  ['02-entrar', '/entrar', 'publico'],
  ['03-obras', '/obras', 'engenheiro'],
  ['04-obra', '/obras/:obra', 'engenheiro'],
  ['05-obra-nova', '/obras/nova', 'engenheiro'],
  ['06-pessoal', '/obras/:obra/pessoal', 'engenheiro'],
  ['07-equipamento', '/obras/:obra/equipamento', 'engenheiro'],
  ['08-servicos', '/obras/:obra/servicos', 'engenheiro'],
  ['09-taxonomia', '/obras/:obra/taxonomia', 'engenheiro'],
  ['10-acesso', '/obras/:obra/acesso', 'engenheiro'],
  ['11-lancamento-hub', '/lancamento/:obra/:dia', 'encarregado'],
  ['12-lancamento-dia', '/lancamento/:obra/:dia/dia', 'encarregado'],
  ['13-lancamento-atividades', '/lancamento/:obra/:dia/atividades', 'encarregado'],
  ['14-lancamento-producao', '/lancamento/:obra/:dia/producao', 'encarregado'],
  ['15-lancamento-observacoes', '/lancamento/:obra/:dia/observacoes', 'encarregado'],
  ['16-rdo', '/rdo/:obra/:dia', 'engenheiro'],
  ['17-rdo-dia-parado', '/rdo/:obra/:diaVazio', 'engenheiro'],
];

async function main() {
  // O próprio Node descobre; não há plumbing de shell entre um passo e outro.
  const ctx = descobreContexto();

  mkdirSync(SAIDA, { recursive: true });
  const navegador = await chromium.launch();
  const falhas = [];

  for (const [aparelho, largura, altura] of APARELHOS) {
    for (const perfil of ['publico', 'engenheiro', 'encarregado']) {
      const alvos = TELAS.filter(([nome, , p]) => {
        if (p !== perfil) return false;
        return filtro === null || filtro.split(',').some((f) => nome.includes(f));
      });
      if (alvos.length === 0) continue;

      const contexto = await navegador.newContext({
        viewport: { width: largura, height: altura },
        deviceScaleFactor: 2,
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        colorScheme: tema,
      });
      if (perfil !== 'publico') {
        await contexto.addCookies([
          {
            name: 'rdo_sessao',
            value: perfil === 'engenheiro' ? ctx.eng : ctx.enc,
            domain: 'localhost',
            path: '/',
          },
        ]);
      }

      const pagina = await contexto.newPage();
      for (const [nome, molde] of alvos) {
        const caminho = molde
          .replace(':obra', ctx.obra)
          .replace(':diaVazio', ctx.diaVazio)
          .replace(':dia', ctx.dia);
        const arquivo = `${SAIDA}/${rotulo === null ? '' : rotulo + '-'}${aparelho}-${nome}.png`;
        try {
          const resposta = await pagina.goto(BASE + caminho, {
            waitUntil: 'networkidle',
            timeout: 25000,
          });
          await pagina.screenshot({ path: arquivo, fullPage: true });
          console.warn(`${aparelho}/${nome} ${resposta?.status() ?? '?'}`);
        } catch (e) {
          falhas.push(`${aparelho}/${nome}: ${e.message.split('\n')[0]}`);
          console.warn(`${aparelho}/${nome} FALHOU`);
        }
      }
      await contexto.close();
    }
  }

  await navegador.close();
  if (falhas.length > 0) {
    writeFileSync(`${SAIDA}/falhas.txt`, falhas.join('\n'), 'utf8');
    console.warn(`\n${falhas.length} falha(s); detalhe em ${SAIDA}/falhas.txt`);
  }
}

await main();
