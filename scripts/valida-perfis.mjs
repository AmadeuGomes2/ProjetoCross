/**
 * Entra como cada perfil e confere o que foi combinado.
 *
 * É o outro lado do `console.mjs`: aquele pergunta se a tela reclama, este
 * pergunta se a tela **obedece à regra**. Cada linha abaixo é uma decisão do
 * dono do produto virada em asserção contra o servidor de verdade, com sessão
 * de verdade.
 *
 * Existe porque teste de unidade prova a composição e a varredura prova que
 * toda rota autoriza — mas nenhum dos dois prova que a TELA que o encarregado
 * abre no celular não tem um caminho para o RDO.
 *
 * Uso: `npm run perfis`. Precisa do servidor no ar.
 */
import { chromium } from 'playwright';

import { descobreContexto } from './contexto.mjs';

const BASE = process.env.RDO_BASE ?? 'http://localhost:3000';

/**
 * As regras, como frases. `perfil` é quem abre, `esperado` é o que tem de
 * acontecer, e `prova` recebe a página já carregada.
 */
function regras(ctx) {
  const obra = ctx.obra;
  const dia = ctx.dia;

  return [
    // ---------------------------------------------------- RDO é do engenheiro
    {
      perfil: 'enc',
      nome: 'encarregado é recusado no RDO',
      url: `/rdo/${obra}/${dia}`,
      prova: async (p) => {
        const texto = await p.locator('body').innerText();
        const temDocumento = texto.includes('RELATÓRIO DIÁRIO DE OBRAS');
        return temDocumento ? 'viu o documento' : null;
      },
    },
    {
      perfil: 'enc',
      nome: 'encarregado é recusado na rota do PDF',
      url: `/rdo/${obra}/${dia}/pdf`,
      esperaStatus: 403,
    },
    {
      perfil: 'eng',
      nome: 'engenheiro vê o RDO',
      url: `/rdo/${obra}/${dia}`,
      prova: async (p) => {
        const texto = await p.locator('body').innerText();
        return texto.includes('RELATÓRIO DIÁRIO DE OBRAS') ? null : 'não viu o documento';
      },
    },

    // ------------------------------------------------ a obra, pelos dois lados
    {
      perfil: 'enc',
      nome: 'encarregado não vê a porta do RDO nem a aba Acesso',
      url: `/obras/${obra}`,
      prova: async (p) => {
        const texto = await p.locator('body').innerText();
        const erros = [];
        if (texto.includes('Ver o RDO de hoje')) erros.push('viu a porta do RDO');
        if (texto.includes('Acesso')) erros.push('viu a aba Acesso');
        if (!texto.includes('Lançar hoje')) erros.push('não viu "Lançar hoje"');
        return erros.length > 0 ? erros.join('; ') : null;
      },
    },
    {
      perfil: 'eng',
      nome: 'engenheiro vê as duas portas e a aba Acesso',
      url: `/obras/${obra}`,
      prova: async (p) => {
        const texto = await p.locator('body').innerText();
        const erros = [];
        if (!texto.includes('Ver o RDO de hoje')) erros.push('não viu a porta do RDO');
        if (!texto.includes('Acesso')) erros.push('não viu a aba Acesso');
        return erros.length > 0 ? erros.join('; ') : null;
      },
    },
    {
      perfil: 'enc',
      nome: 'no painel de dias, o encarregado só é levado ao lançamento',
      url: `/obras/${obra}`,
      prova: async (p) => {
        const paraRdo = await p.locator('a[href*="/rdo/"]').count();
        return paraRdo > 0 ? `${paraRdo} link(s) para /rdo` : null;
      },
    },

    // ------------------------------------------------------- pessoal e frota
    {
      perfil: 'enc',
      nome: 'encarregado lê o pessoal, sem formulário de cadastro',
      url: `/obras/${obra}/pessoal`,
      prova: async (p) => {
        const texto = await p.locator('body').innerText();
        const erros = [];
        if (!texto.includes('Pessoal cadastrado')) erros.push('não leu a lista');
        if (texto.includes('Cadastrar pessoa')) erros.push('viu o formulário');
        if (texto.includes('Trocar de função')) erros.push('viu a troca de função');
        return erros.length > 0 ? erros.join('; ') : null;
      },
    },
    {
      perfil: 'enc',
      nome: 'encarregado cadastra equipamento',
      url: `/obras/${obra}/equipamento`,
      prova: async (p) => {
        const texto = await p.locator('body').innerText();
        return texto.includes('Cadastrar equipamento') ? null : 'não viu o formulário';
      },
    },
    {
      perfil: 'enc',
      nome: 'encarregado é recusado na tela de acessos',
      url: `/obras/${obra}/acesso`,
      prova: async (p) => {
        const texto = await p.locator('body').innerText();
        return texto.includes('Gerar link de convite') ? 'viu o convite' : null;
      },
    },

    // --------------------------------------------- editar e o aviso de impacto
    {
      perfil: 'eng',
      nome: 'engenheiro tem como alterar informações gerais e BM,S',
      url: `/obras/${obra}`,
      prova: async (p) => {
        const texto = await p.locator('body').innerText();
        const erros = [];
        if (!texto.includes('Alterar informações gerais')) erros.push('sem editar obra');
        if (!texto.includes('Alterar')) erros.push('sem alterar período');
        return erros.length > 0 ? erros.join('; ') : null;
      },
    },
    {
      perfil: 'eng',
      nome: 'o aviso de impacto aparece ao abrir a alteração do cabeçalho',
      url: `/obras/${obra}`,
      prova: async (p) => {
        // A gaveta é `<details>`: o conteúdo existe no DOM mesmo fechada.
        const aviso = await p.locator('text=/Isto alcança .* dias lançados/').count();
        return aviso > 0 ? null : 'aviso de impacto ausente';
      },
    },
    {
      perfil: 'enc',
      nome: 'encarregado não vê a alteração das informações gerais',
      url: `/obras/${obra}`,
      prova: async (p) => {
        const texto = await p.locator('body').innerText();
        return texto.includes('Alterar informações gerais') ? 'viu a edição' : null;
      },
    },

    // ----------------------------------------------------- RDO de período
    {
      perfil: 'eng',
      nome: 'engenheiro tem o seletor de período na obra',
      url: `/obras/${obra}`,
      prova: async (p) => {
        const texto = await p.locator('body').innerText();
        const erros = [];
        if (!texto.includes('Exportar um período')) erros.push('sem o seletor');
        if (!texto.includes('Escolher dias a dedo')) erros.push('sem dias avulsos');
        return erros.length > 0 ? erros.join('; ') : null;
      },
    },
    {
      perfil: 'enc',
      nome: 'encarregado não vê o seletor de período',
      url: `/obras/${obra}`,
      prova: async (p) => {
        const texto = await p.locator('body').innerText();
        return texto.includes('Exportar um período') ? 'viu o seletor' : null;
      },
    },
    {
      perfil: 'enc',
      nome: 'encarregado é recusado ao exportar um período',
      url: `/rdo/${obra}/periodo`,
      metodo: 'POST',
      corpo: { dias: [dia], modo: 'consolidado', formato: 'PDF' },
      esperaStatus: 403,
    },
    {
      perfil: 'eng',
      nome: 'engenheiro exporta um período, e vem um PDF',
      url: `/rdo/${obra}/periodo`,
      metodo: 'POST',
      corpo: { dias: [dia], modo: 'consolidado', formato: 'PDF' },
      esperaStatus: 200,
    },

    // -------------------------------------------------------------- lançamento
    {
      perfil: 'enc',
      nome: 'encarregado abre o lançamento do dia',
      url: `/lancamento/${obra}/${dia}`,
      prova: async (p) => {
        const texto = await p.locator('body').innerText();
        return texto.includes('Confirmar o dia') ? null : 'não abriu o hub';
      },
    },
  ];
}

async function main() {
  const ctx = descobreContexto();
  const navegador = await chromium.launch();
  const falhas = [];
  let passaram = 0;

  for (const regra of regras(ctx)) {
    const contexto = await navegador.newContext({
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });
    await contexto.addCookies([
      { name: 'rdo_sessao', value: ctx[regra.perfil], domain: 'localhost', path: '/' },
    ]);
    const pagina = await contexto.newPage();

    let problema = null;
    try {
      /*
       * `POST` vai pelo contexto, não pela navegação: a exportação de período
       * recebe o conjunto no corpo, e `page.goto` só faz `GET`. O cookie da
       * sessão acompanha os dois caminhos.
       */
      const resposta =
        regra.metodo === 'POST'
          ? await contexto.request.post(BASE + regra.url, { data: regra.corpo })
          : await pagina.goto(BASE + regra.url, {
              waitUntil: 'networkidle',
              timeout: 25000,
            });
      const status = resposta?.status() ?? 0;

      if (regra.esperaStatus !== undefined) {
        problema =
          status === regra.esperaStatus
            ? null
            : `status ${status}, esperado ${regra.esperaStatus}`;
      } else {
        problema = await regra.prova(pagina);
      }
    } catch (e) {
      problema = 'erro: ' + e.message.split('\n')[0];
    }

    const etiqueta = regra.perfil === 'eng' ? 'engenheira ' : 'encarregado';
    if (problema === null) {
      passaram += 1;
      console.warn(`ok      ${etiqueta}  ${regra.nome}`);
    } else {
      falhas.push(`${etiqueta}  ${regra.nome}: ${problema}`);
      console.warn(`FALHOU  ${etiqueta}  ${regra.nome}`);
      console.warn(`        ${problema}`);
    }
    await contexto.close();
  }

  await navegador.close();
  console.warn(
    `\n${passaram} de ${passaram + falhas.length} regras confirmadas no navegador.`,
  );
  if (falhas.length > 0) process.exitCode = 1;
}

await main();
