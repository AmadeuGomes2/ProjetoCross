/**
 * Popula o banco local com um mês de obra, para demonstração.
 *
 * **Todo nome aqui é inventado.** Pessoa, equipamento e texto de atividade são
 * ficção escrita para esta carga; nada veio da planilha de referência. É
 * exigência do CLAUDE.md, seção Segurança: dado de trabalhador é dado pessoal
 * sob a LGPD, e captura de tela de demonstração circula.
 *
 * **Escreve pelos casos de uso, nunca por `INSERT`.** Se o seed passasse por
 * cima das regras, a demonstração provaria que o banco aceita linhas, e não que
 * o sistema funciona. Assim ele atravessa a validação de borda, a autorização
 * por perfil e o cálculo — e quebra aqui se alguma regra for violada, em vez de
 * quebrar na frente do cliente.
 *
 * **Idempotente pelo mecanismo do próprio produto.** Cada lançamento leva uma
 * `chaveDeRascunho` derivada do dia e do assunto; reenviar a mesma chave não
 * duplica (arquitetura, decisão 18). Rodar duas vezes dá o mesmo banco.
 *
 * **Sem `Math.random`.** O sorteio é um gerador congruencial semeado pela data,
 * de modo que a mesma data sempre produz o mesmo dia de obra. Demonstração que
 * muda a cada execução não se ensaia.
 *
 * Uso: `npm run demonstracao`
 */

import { fileURLToPath } from 'node:url';

import { autenticaRequisicao } from '../src/modules/acesso';
import { iniciaSessaoComSenha } from '../src/modules/acesso/autenticacao';
import type { Ator } from '../src/modules/acesso';
import { ambienteDaComposicao } from '../src/app/_composicao/ambiente';
import { paraAcesso } from '../src/app/_composicao/ambiente-de-cadastro';
import {
  cadastraEquipamentoProtegido,
  cadastraPeriodoBmsProtegido,
  cadastraPessoaProtegida,
  defineQuantidadeDeProjetoProtegida,
  listaEquipamentosProtegida,
  listaPessoalProtegida,
  listaPeriodosBmsProtegida,
  listaServicosProtegida,
} from '../src/app/_composicao/cadastro';
import { casosDeLancamento } from '../src/app/_composicao/lancamento';
import { diaDaSemana, somaDias, type DiaPuro } from '../src/shared/date/dia';
import { hojeNaObra } from '../src/shared/date/fuso';
import { idConfiavel, type ObraId } from '../src/shared/id';

const ENGENHEIRA = ['engenheira@obra.local', 'Engenheira#2026'] as const;
const ENCARREGADO = ['encarregado@obra.local', 'Encarregado#2026'] as const;

/** Quantos dias para trás a demonstração cobre. Um mês conta uma história. */
const DIAS_DE_HISTORIA = 31;

/**
 * O elenco. Uma pessoa por função da taxonomia, mais reforço onde a obra
 * realmente tem mais gente, para que o bloco 5 do RDO apareça cheio.
 */
const ELENCO: readonly (readonly [string, string])[] = [
  ['Helena Marques', 'Enc. Geral'],
  ['Rubens Tavares', 'Feitor'],
  ['Camila Prado', 'Auxiliar eng.'],
  ['Otávio Lemos', 'ADM'],
  ['Luana Ferraz', 'Topografo'],
  ['Gilberto Nunes', 'Operador III'],
  ['Wesley Aragão', 'Operador II'],
  ['Marcos Vilela', 'Op. Rolo C.'],
  ['Danilo Bastos', 'Op. Retro'],
  ['Éder Quintana', 'Motorista'],
  ['Sérgio Palhares', 'Motorista'],
  ['Norberto Aguiar', 'Pedreiro'],
  ['Iara Cordeiro', 'Servente'],
  ['Elias Rangel', 'Servente'],
  ['Tarcísio Bueno', 'Servente'],
];

/** Identificador e tipo. O identificador é o que sai no bloco 6 do RDO. */
const FROTA: readonly (readonly [string, string])[] = [
  ['CB-52', 'CARRO'],
  ['CF-29', 'CARREGADEIRA'],
  ['MT-22', 'BASCULA'],
  ['RC-18', 'ROLO'],
  ['RE-17', 'RETRO'],
  ['PT-08', 'PATROL'],
  ['TR-31', 'TRATOR'],
  ['AP-04', 'APOIO'],
];

/** Quantidade de projeto por serviço, em metro quadrado. */
const PROJETO: Readonly<Record<string, string>> = {
  'REC.(FRESA+CAPA)': '18500,000',
  'REC.(FRESA+BINDER+CAPA)': '9200,000',
  'RECICLAGEM(BASE+CAPA)': '6400,000',
  'IM.(SUBLEITO+BASE+CAPA)': '3750,000',
};

const RUAS = [
  'Rua 21, bairro Santo Amaro',
  'Avenida Deputado Esteves Rodrigues',
  'Rua Coronel Prates, centro',
  'Avenida Mestra Fininha',
  'Rua Jaime Oliveira, Ibituruna',
  'Avenida Dona Quita, Todos os Santos',
  'Rua Pedro Nolasco, Vila Oliveira',
  'Avenida Sanitária, Major Prates',
];

/**
 * Sorteio determinístico.
 *
 * Congruencial linear semeado pelo texto da data: o mesmo dia devolve sempre a
 * mesma sequência. `Math.random` faria a demonstração mudar a cada execução, e
 * o que muda não se ensaia.
 */
function sorteador(semente: string): () => number {
  let estado = 0;
  for (const letra of semente) estado = (estado * 31 + letra.charCodeAt(0)) >>> 0;

  /*
   * Mistura a semente antes de usar (o finalizador do murmur3).
   *
   * Sem isto, sementes vizinhas davam sequências vizinhas — e aqui as sementes
   * são datas que diferem em um caractere. A primeira carga saiu com 27 dias
   * trabalhados e **nenhum** parado, embora a chance de chuva fosse de 13%;
   * depois, com um descarte simples, os primeiros sorteios ainda alternavam
   * visivelmente: 0,26 · 0,77 · 0,27 · 0,78. Um bit de diferença na entrada
   * precisa mudar metade dos bits da saída, e é isso que estas quatro linhas
   * fazem.
   */
  estado = Math.imul(estado ^ (estado >>> 16), 0x85eb_ca6b) >>> 0;
  estado = Math.imul(estado ^ (estado >>> 13), 0xc2b2_ae35) >>> 0;
  estado = (estado ^ (estado >>> 16)) >>> 0;

  return () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado / 0x1_0000_0000;
  };
}

function escolhe<T>(lista: readonly T[], sorteia: () => number): T {
  const item = lista[Math.floor(sorteia() * lista.length)];
  if (item === undefined) throw new Error('lista vazia no sorteio');
  return item;
}

/**
 * Fisher-Yates com o sorteador semeado.
 *
 * Existe para sortear **sem reposição**. Sorteando com reposição, um dia saía
 * com "Transporte de massa asfáltica — Rua Coronel Prates" duas vezes, e numa
 * demonstração isso se lê como defeito do sistema, não do dado.
 *
 * Consome exatamente `n-1` sorteios, sempre os mesmos: `sort(() => sorteia() -
 * 0.5)` consumiria um número imprevisível deles — além de ser comparador
 * inconsistente — e quebraria a repetibilidade da carga.
 */
function embaralha<T>(lista: readonly T[], sorteia: () => number): T[] {
  const baralho = [...lista];
  for (let i = baralho.length - 1; i > 0; i -= 1) {
    const j = Math.floor(sorteia() * (i + 1));
    const a = baralho[i];
    const b = baralho[j];
    if (a !== undefined && b !== undefined) {
      baralho[i] = b;
      baralho[j] = a;
    }
  }
  return baralho;
}

/** Devolve o valor ou explode com a mensagem do domínio. Seed não engole erro. */
function exige<T>(
  r: { ok: true; valor: T } | { ok: false; erro: { mensagem: string } },
  oque: string,
): T {
  if (!r.ok) throw new Error(`${oque}: ${r.erro.mensagem}`);
  return r.valor;
}

async function atorDe(credenciais: readonly [string, string]): Promise<Ator> {
  const amb = ambienteDaComposicao().cadastro;
  const sessao = await iniciaSessaoComSenha(credenciais[0], credenciais[1], amb);
  if (!sessao.ok) throw new Error(`não entrei como ${credenciais[0]}`);
  const ator = await autenticaRequisicao(sessao.valor.token, paraAcesso(amb));
  if (!ator.ok) throw new Error('sessão criada mas não autenticou');
  return await ator.valor;
}

async function main(): Promise<void> {
  const sqlite = ambienteDaComposicao().conexao.sqlite;
  const obra = sqlite.prepare('SELECT id FROM obra ORDER BY criado_em LIMIT 1').get() as
    { id: string } | undefined;
  if (obra === undefined) {
    console.warn('Não há obra no banco. Rode `npm run db:preparar` antes.');
    process.exit(1);
  }
  const obraId = idConfiavel<'obra'>(obra.id) as ObraId;

  const eng = await atorDe(ENGENHEIRA);
  const enc = await atorDe(ENCARREGADO);
  const casos = casosDeLancamento();

  const hoje = hojeNaObra();
  const primeiro = somaDias(hoje, -(DIAS_DE_HISTORIA - 1));
  console.warn(`Obra ${obra.id}`);
  console.warn(`Período ${primeiro} a ${hoje}\n`);

  // ---------------------------------------------------------------- cadastro

  const jaPessoas = new Set(
    (
      exige(listaPessoalProtegida(eng, obraId), 'listar pessoal') as { nome: string }[]
    ).map((p) => p.nome),
  );
  let novasPessoas = 0;
  for (const [nome, funcao] of ELENCO) {
    if (jaPessoas.has(nome)) continue;
    exige(
      cadastraPessoaProtegida(eng, obraId, { nome, funcao, entrada: primeiro }),
      `cadastrar ${nome}`,
    );
    novasPessoas += 1;
  }
  console.warn(`pessoal        ${novasPessoas} nova(s), ${jaPessoas.size} já existia(m)`);

  const jaEquip = new Set(
    (
      exige(listaEquipamentosProtegida(eng, obraId), 'listar equipamento') as {
        identificador: string;
      }[]
    ).map((e) => e.identificador),
  );
  let novosEquip = 0;
  for (const [identificador, tipo] of FROTA) {
    if (jaEquip.has(identificador)) continue;
    exige(
      cadastraEquipamentoProtegido(eng, obraId, {
        identificador,
        tipo,
        entrada: primeiro,
      }),
      `cadastrar ${identificador}`,
    );
    novosEquip += 1;
  }
  console.warn(`equipamento    ${novosEquip} novo(s), ${jaEquip.size} já existia(m)`);

  /*
   * Quantidade de projeto: sem ela o bloco 7 sai com PROJETO 0,00 e o
   * percentual não existe, que é exatamente como a tela estava.
   */
  const servicos = exige(listaServicosProtegida(eng, obraId), 'listar serviços') as {
    servicoId: string;
    nome: string;
  }[];
  for (const s of servicos) {
    const quantidade = PROJETO[s.nome];
    if (quantidade === undefined) continue;
    exige(
      defineQuantidadeDeProjetoProtegida(
        eng,
        obraId,
        idConfiavel<'servico_controlado'>(s.servicoId),
        quantidade,
      ),
      `projeto de ${s.nome}`,
    );
  }
  console.warn(`projeto        ${servicos.length} serviço(s) com quantidade`);

  /* Período de BM'S que cubra o mês anterior, para nenhum dia sair sem BM'S. */
  const periodos = exige(listaPeriodosBmsProtegida(eng, obraId), 'listar BMS') as {
    numero: number;
  }[];
  if (!periodos.some((p) => p.numero === 6)) {
    cadastraPeriodoBmsProtegido(eng, obraId, {
      numero: '6',
      dataInicial: '2026-08-01',
      dataFinal: '2026-08-31',
    });
    console.warn(`BM'S           6 cadastrado (agosto)`);
  }

  // ------------------------------------------------------------- lançamentos

  let trabalhados = 0;
  let parados = 0;
  let domingos = 0;
  let fechados = 0;
  let jaFechados = 0;

  for (let passo = 0; passo < DIAS_DE_HISTORIA; passo += 1) {
    const data = somaDias(primeiro, passo) as DiaPuro;
    const sorteia = sorteador(data);

    // Domingo não tem lançamento, e isso é verdade da obra, não falha do seed:
    // o painel mostra "não lançado", que é o estado correto (decisão 4.2).
    if (diaDaSemana(data) === 'Domingo') {
      domingos += 1;
      continue;
    }

    /*
     * Dia fechado não se toca.
     *
     * Fechar congela o número do RDO e entrega o documento ao fiscal; daí em
     * diante só existe retificação, e o sistema recusa qualquer outra escrita.
     * Sem este desvio, rodar o seed duas vezes parava na primeira data já
     * fechada — que é exatamente o que aconteceu ao escrevê-lo.
     */
    const fechado =
      (
        sqlite
          .prepare('SELECT fechado_em FROM dia_de_obra WHERE obra_id = ? AND data = ?')
          .get(obraId, data) as { fechado_em: string | null } | undefined
      )?.fechado_em != null;
    if (fechado) {
      jaFechados += 1;
      continue;
    }

    /*
     * Chove em cerca de um dia em cada cinco, e o motivo é obrigatório (20.1).
     *
     * Mas **dia que já tem atividade não vira parado**: o sistema recusa, com
     * razão, porque `parado` e "houve trabalho" se contradizem. A regra apareceu
     * quando esta carga tentou chover sobre um dia que já existia no banco. O
     * seed respeita o que já foi lançado em vez de forçar o sorteio por cima.
     */
    const jaTemAtividade =
      (
        sqlite
          .prepare(
            'SELECT COUNT(*) c FROM lancamento_atividade WHERE obra_id = ? AND data = ?',
          )
          .get(obraId, data) as { c: number }
      ).c > 0;
    /*
     * O sorteio acontece SEMPRE, antes da guarda.
     *
     * Escrito como `!jaTemAtividade && sorteia() < 0.18`, o curto-circuito
     * pulava o sorteio nos dias que já tinham atividade e deslocava toda a
     * sequência seguinte: a segunda execução sorteava outra coisa e gravava
     * atividade a mais. Determinismo não sobrevive a `&&`.
     */
    const sorteouChuva = sorteia() < 0.18;
    const choveu = !jaTemAtividade && sorteouChuva;

    if (choveu) {
      exige(
        await casos.recebeConfirmacaoDoDia(
          {
            obraId,
            data,
            estado: 'parado',
            motivoParada: 'Chuva forte durante todo o turno, frente de serviço alagada',
            // B, C e I são as únicas letras aceitas (decisão 2.1); a letra
            // `N` que a macro VBA pintava não entrou no sistema.
            noiteAnterior: 'C',
            manha: 'I',
            tarde: 'C',
            indiceMm: String(18 + Math.floor(sorteia() * 30)),
          },
          enc,
        ),
        `dia parado ${data}`,
      );
      parados += 1;
    } else {
      exige(
        await casos.recebeConfirmacaoDoDia(
          {
            obraId,
            data,
            estado: 'trabalhado',
            noiteAnterior: escolhe(['B', 'B', 'C'], sorteia),
            manha: escolhe(['B', 'B', 'B', 'C'], sorteia),
            tarde: escolhe(['B', 'B', 'C'], sorteia),
            indiceMm: sorteia() < 0.25 ? String(Math.floor(sorteia() * 9)) : '0',
          },
          enc,
        ),
        `dia trabalhado ${data}`,
      );
      trabalhados += 1;

      // Duas a três atividades, com status vindo da taxonomia herdada.
      const quantasAtividades = 2 + Math.floor(sorteia() * 2);
      const feitos = [
        ['Fresagem do trecho', 'Produção'],
        ['Aplicação de CBUQ', 'Produção'],
        ['Imprimação da base', 'Produção'],
        ['Reciclagem da base', 'Produção'],
        ['Transporte de massa asfáltica', 'Transporte'],
        ['Limpeza da pista após aplicação', 'Limpeza'],
        ['Levantamento topográfico do trecho', 'Levantamento'],
        ['Aguardando liberação do trecho pelo fiscal', 'Pendências - Cliente'],
      ] as const;

      const doDia = embaralha(feitos, sorteia).slice(0, quantasAtividades);
      const ruasDoDia = embaralha(RUAS, sorteia);
      for (const [i, par] of doDia.entries()) {
        const [oque, status] = par;
        exige(
          await casos.recebeAtividade(
            {
              obraId,
              data,
              descricao: `${oque} — ${ruasDoDia[i] ?? RUAS[0]}`,
              status: { tipo: 'termo', termo: status },
              chaveDeRascunho: `demo-atividade-${data}-${i}`,
            },
            enc,
          ),
          `atividade ${data}/${i}`,
        );
      }

      // Produção em um ou dois serviços. É o que faz o acumulado crescer.
      const quantosServicos = 1 + Math.floor(sorteia() * 2);
      const sorteados = embaralha(servicos, sorteia).slice(0, quantosServicos);
      for (const [i, s] of sorteados.entries()) {
        const metros = 180 + Math.floor(sorteia() * 520);
        exige(
          await casos.recebeProducao(
            {
              obraId,
              data,
              servico: { tipo: 'id', id: s.servicoId },
              quantidade: `${metros},500`,
              chaveDeRascunho: `demo-producao-${data}-${i}`,
            },
            enc,
          ),
          `produção ${data}/${s.nome}`,
        );
      }

      // Observação da CROS. O lado CONTRATANTE sai sempre vazio na v1 (10.1).
      if (sorteia() < 0.55) {
        const recados = [
          'Fiscal esteve no trecho e liberou a camada de base.',
          'Massa asfáltica chegou com duas horas de atraso da usina.',
          'Trecho sinalizado e liberado ao tráfego no fim do turno.',
          'Equipe reduzida: dois serventes em atestado médico.',
          'Concessionária de água abriu vala no trecho previsto para amanhã.',
        ];
        exige(
          await casos.recebeObservacao(
            {
              obraId,
              data,
              lado: 'CROS',
              texto: escolhe(recados, sorteia),
              chaveDeRascunho: `demo-observacao-${data}`,
            },
            enc,
          ),
          `observação ${data}`,
        );
      }
    }

    /*
     * Fecha o que já foi entregue: tudo com mais de dez dias. Fechar é do
     * engenheiro (9.1), e é o que congela o número do RDO. Deixa os últimos
     * dias abertos, para a demonstração poder mostrar edição.
     */
    if (passo < DIAS_DE_HISTORIA - 10) {
      const fechou = await casos.recebeFechamento({ obraId, data }, eng);
      if (fechou.ok) fechados += 1;
    }
  }

  console.warn('');
  console.warn(`trabalhados    ${trabalhados}`);
  console.warn(`parados        ${parados}`);
  console.warn(`domingos       ${domingos} (sem lançamento, de propósito)`);
  console.warn(`fechados       ${fechados}`);
  if (jaFechados > 0) console.warn(`ja fechados    ${jaFechados} (intocados)`);
  console.warn('\nPronto. Entre em http://localhost:3000/entrar');
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  void main();
}
