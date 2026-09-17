/**
 * Descobre o contexto que a captura de telas precisa e abre as duas sessões.
 *
 * Imprime uma linha `RDO_CONTEXTO={...}` que `scripts/contexto.mjs` lê e
 * repassa a `telas.mjs`, `console.mjs` e `valida-perfis.mjs`.
 *
 * ## Por que passou a falar HTTP, e não SQL
 *
 * Até 17/09/2026 isto abria o banco e consultava direto. Depois da migração
 * para Postgres, o banco de desenvolvimento é PGlite numa pasta, e **PGlite
 * abre a pasta com exclusividade**: com `npm run dev` no ar, este processo não
 * conseguia abrir o banco, e `npm run telas` deixou de funcionar na máquina de
 * quem desenvolve.
 *
 * A descoberta agora entra pelo navegador, como uma pessoa entraria. Além de
 * resolver o conflito, ficou mais honesta em dois pontos:
 *
 * - **a sessão é a de verdade**, o cookie que o servidor emitiu, e não um token
 *   fabricado pelo módulo;
 * - **o dia vem da tela**, e não de um `COUNT(*)`. A própria obra distingue o
 *   dia lançado, que aponta para `/rdo/...`, do dia vazio, que aponta para
 *   `/lancamento/...`. Fotografar o que a interface oferece é o ponto.
 *
 * Como consequência, isto funciona igual contra o banco local e contra o Neon.
 *
 * Não inventa dado: usa a obra e os dias que já existem. Se não houver, diz o
 * que rodar.
 */
import { chromium, type BrowserContext } from 'playwright';

const BASE = process.env['RDO_BASE'] ?? 'http://localhost:3000';

const CONTAS = {
  eng: ['engenheira@obra.local', 'Engenheira#2026'],
  enc: ['encarregado@obra.local', 'Encarregado#2026'],
} as const;

/** O nome do cookie de sessão. Se mudar no servidor, muda aqui. */
const COOKIE_DE_SESSAO = 'rdo_sessao';

function desiste(mensagem: string): never {
  console.warn(mensagem);
  process.exit(1);
}

/** Entra pela tela e devolve o valor do cookie de sessão. */
async function entra(ctx: BrowserContext, rotulo: string): Promise<string> {
  const [email, senha] = CONTAS[rotulo as keyof typeof CONTAS];
  const pagina = await ctx.newPage();
  await pagina.goto(`${BASE}/entrar`, { waitUntil: 'networkidle' });
  await pagina.fill('input[name="email"]', email);
  await pagina.fill('input[name="senha"]', senha);
  await Promise.all([
    // A ação de servidor redireciona; esperar a URL mudar é o sinal de que
    // entrou. Sem isto, a leitura do cookie acontece antes da resposta.
    pagina.waitForURL((u) => !u.pathname.startsWith('/entrar'), { timeout: 20_000 }),
    pagina.click('button[type="submit"]'),
  ]).catch(() => desiste(`Não consegui entrar como ${rotulo}. Confira as contas.`));

  const cookie = (await ctx.cookies()).find((c) => c.name === COOKIE_DE_SESSAO);
  if (cookie === undefined) desiste(`Entrei como ${rotulo} mas não recebi sessão.`);
  return cookie.value;
}

async function main(): Promise<void> {
  const navegador = await chromium.launch();
  try {
    const contextos = {
      eng: await navegador.newContext({ locale: 'pt-BR' }),
      enc: await navegador.newContext({ locale: 'pt-BR' }),
    };
    const eng = await entra(contextos.eng, 'eng');
    const enc = await entra(contextos.enc, 'enc');

    const pagina = await contextos.eng.newPage();
    await pagina.goto(`${BASE}/obras`, { waitUntil: 'networkidle' });

    // `/obras/nova` também casa o prefixo; o identificador é o que distingue.
    const naLista = await pagina
      .locator('a[href^="/obras/"]')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    const obra = naLista
      .map((href) => href.split('/')[2] ?? '')
      .find((id) => /^[0-9a-f-]{36}$/.test(id));
    if (obra === undefined) {
      desiste('Não há obra visível para a engenheira. Rode `npm run demonstracao`.');
    }

    await pagina.goto(`${BASE}/obras/${obra}`, { waitUntil: 'networkidle' });
    const links = await pagina
      .locator('a[href]')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));

    const datasDe = (prefixo: string): string[] =>
      links
        .filter((h) => h.startsWith(`${prefixo}/${obra}/`))
        .map((h) => h.split('/')[3] ?? '')
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

    // Dia lançado aponta para o RDO; dia por lançar aponta para o lançamento.
    const lancados = datasDe('/rdo');
    const dia = lancados[0];
    if (dia === undefined) {
      desiste('Nenhum dia lançado nesta obra. Rode `npm run demonstracao`.');
    }

    /*
     * Vazio é o dia que tem porta de lançamento e **não** tem RDO.
     *
     * Não basta pegar o primeiro `/lancamento/...`: hoje aparece nos dois
     * lados, porque o engenheiro pode abrir o RDO e ainda lançar. Sem esta
     * subtração, `diaVazio` saía igual a `dia` e a foto do estado vazio
     * fotografava a tela cheia.
     */
    const diaVazio = datasDe('/lancamento').find((d) => !lancados.includes(d));

    console.warn(
      'RDO_CONTEXTO=' +
        JSON.stringify({ obra, dia, diaVazio: diaVazio ?? dia, eng, enc }),
    );
  } finally {
    await navegador.close();
  }
}

void main();
