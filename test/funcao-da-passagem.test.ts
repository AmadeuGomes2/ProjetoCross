/**
 * Decisão 29.1, de 16/09/2026 (`docs/prd/v1.md`, DECISÕES TOMADAS):
 *
 * > **Função é atributo da passagem, não da pessoa.** Mudar de função encerra a
 * > passagem e abre outra, então RDO já emitido não muda. Como a passagem é por
 * > obra, a mesma pessoa pode ter função diferente em obras diferentes.
 *
 * Origem das expectativas — nenhuma lida da implementação:
 *
 * - a decisão 29.1, acima, para onde a função mora e para o que a troca faz;
 * - `regras-extraidas.md` §1 e decisão 1.1, para a regra de contagem, que **não
 *   muda**: conta quem tem `entrada <= D` e (`saída` nula ou `saída >= D`);
 * - R3 e caso obrigatório 8: uma pessoa conta uma vez, tenha as passagens que
 *   tiver.
 *
 * O teste que prova a decisão é o terceiro: o RDO de 15/03 diz `Motorista`
 * **antes e depois** da troca para `Operador II` em 21/03. Com a função no
 * cadastro da pessoa, o segundo cálculo diria `Operador II`, e o documento
 * contratual que o fiscal já recebeu mudaria sozinho.
 *
 * Dado sintético: `P1` é rótulo do PRD, não pessoa.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraTaxonomia } from '../src/app/_composicao/ambiente-de-cadastro';
import {
  cadastraPessoaProtegida,
  listaMobilizacaoDePessoalProtegida,
  listaPessoalProtegida,
  trocaFuncaoProtegida,
} from '../src/app/_composicao/cadastro';
import type { Ator } from '../src/modules/acesso';
import { calculaEfetivoPessoal, type BlocoDeEfetivo } from '../src/modules/rdo/efetivo';
import { listaFuncoesParaEfetivo } from '../src/modules/taxonomia';
import { diaPuroConfiavel } from '../src/shared/date/dia';
import { CODIGO_ERRO } from '../src/shared/result';
import type { ObraId } from '../src/shared/id';
import {
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from './fixtures/cenario-de-cadastro';

let cenario: Cenario;
let e1: Ator;
let obraId: ObraId;

beforeEach(async () => {
  cenario = await montaCenario();
  e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
  obraId = await criaObraDoPrd(e1, cenario.amb);
});

afterEach(async () => {
  await cenario.fecha();
});

function cadastra(nome: string, funcao: string, entrada: string, saida?: string) {
  return cadastraPessoaProtegida(
    e1,
    obraId,
    saida === undefined ? { nome, funcao, entrada } : { nome, funcao, entrada, saida },
    cenario.amb,
  );
}

function troca(pessoaId: string, funcao: string, aPartirDe: string) {
  return trocaFuncaoProtegida(e1, obraId, { pessoaId, funcao, aPartirDe }, cenario.amb);
}

/** O bloco 5 como o RDO o monta, no dia pedido. */
async function efetivoPessoal(dia: string): Promise<BlocoDeEfetivo> {
  const mobilizacao = await listaMobilizacaoDePessoalProtegida(e1, obraId, cenario.amb);
  if (!mobilizacao.ok) throw new Error(mobilizacao.erro.mensagem);
  const funcoes = await listaFuncoesParaEfetivo(paraTaxonomia(cenario.amb));
  if (!funcoes.ok) throw new Error(funcoes.erro.mensagem);

  return await calculaEfetivoPessoal(
    funcoes.valor,
    mobilizacao.valor,
    diaPuroConfiavel(dia),
    false,
  );
}

/** Só as colunas com gente, para a expectativa falar da regra e não do cadastro. */
function comQuantidade(bloco: BlocoDeEfetivo): [string, number][] {
  return bloco.colunas
    .filter((c) => c.quantidade > 0)
    .map((c) => [c.rotulo, c.quantidade]);
}

/** O cenário da decisão: Motorista até 20/03, Operador II de 21/03 em diante. */
async function pessoaQueTrocouDeFuncao(): Promise<string> {
  const criada = await cadastra('P1', 'Motorista', '2026-02-10');
  if (!criada.ok) throw new Error(criada.erro.mensagem);
  const trocada = await troca(criada.valor, 'Operador II', '2026-03-21');
  if (!trocada.ok) throw new Error(trocada.erro.mensagem);
  return criada.valor;
}

describe('decisão 29.1 — a função do efetivo vem da passagem que cobre o dia', () => {
  it('conta a pessoa em Motorista no RDO de 15/03', async () => {
    await pessoaQueTrocouDeFuncao();
    expect(comQuantidade(await efetivoPessoal('2026-03-15'))).toEqual([['Motorista', 1]]);
  });

  it('conta a pessoa em Operador II no RDO de 25/03', async () => {
    await pessoaQueTrocouDeFuncao();
    expect(comQuantidade(await efetivoPessoal('2026-03-25'))).toEqual([
      ['Operador II', 1],
    ]);
  });

  it('mantém Motorista no RDO de 15/03 depois da troca de função', async () => {
    // **O ponto inteiro da decisão 29.1.** O RDO é documento contratual: o
    // efetivo impresso reflete o que era verdade NAQUELE dia. Com a função no
    // cadastro da pessoa, esta asserção falharia com `Operador II`, e duas
    // cópias do mesmo dia divergiriam sem ninguém saber qual vale.
    const criada = await cadastra('P1', 'Motorista', '2026-02-10');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const antesDaTroca = comQuantidade(await efetivoPessoal('2026-03-15'));
    expect((await troca(criada.valor, 'Operador II', '2026-03-21')).ok).toBe(true);
    const depoisDaTroca = comQuantidade(await efetivoPessoal('2026-03-15'));

    expect(antesDaTroca).toEqual([['Motorista', 1]]);
    expect(depoisDaTroca).toEqual(antesDaTroca);
  });

  it('conta a pessoa uma vez no dia do corte, e só na função nova', async () => {
    // Fronteira do corte: 21/03 é o PRIMEIRO dia na função nova, e a passagem
    // anterior termina em 20/03. Contar nas duas dobraria o TOTAL do bloco 5.
    await pessoaQueTrocouDeFuncao();
    expect(comQuantidade(await efetivoPessoal('2026-03-21'))).toEqual([
      ['Operador II', 1],
    ]);
    expect((await efetivoPessoal('2026-03-21')).total).toBe(1);
  });

  it('conta a pessoa em Motorista na véspera do corte', async () => {
    // A outra metade da fronteira: 20/03 é o ÚLTIMO dia na função antiga,
    // porque a saída é o último dia trabalhado (decisão 1.1).
    await pessoaQueTrocouDeFuncao();
    expect(comQuantidade(await efetivoPessoal('2026-03-20'))).toEqual([['Motorista', 1]]);
  });
});

describe('decisão 29.1 — a troca encerra uma passagem e abre outra', () => {
  it('encerra a passagem antiga na véspera e abre a nova no dia do corte', async () => {
    const pessoaId = await pessoaQueTrocouDeFuncao();

    const lista = await listaPessoalProtegida(e1, obraId, cenario.amb);
    expect(lista.ok).toBe(true);
    if (!lista.ok) return;
    const p1 = lista.valor.find((p) => p.pessoaId === pessoaId);

    expect(p1?.passagens.map((p) => [p.funcaoTermo, p.entrada, p.saida])).toEqual([
      ['Motorista', '2026-02-10', '2026-03-20'],
      ['Operador II', '2026-03-21', null],
    ]);
  });

  it('preserva a data de saída da passagem antiga na passagem nova', async () => {
    // A troca divide a passagem; não estende nem encurta o período na obra.
    const criada = await cadastra('P1', 'Motorista', '2026-02-10', '2026-04-30');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;
    expect((await troca(criada.valor, 'Operador II', '2026-03-21')).ok).toBe(true);

    const lista = await listaPessoalProtegida(e1, obraId, cenario.amb);
    expect(
      lista.ok && lista.valor[0]?.passagens.map((p) => [p.entrada, p.saida]),
    ).toEqual([
      ['2026-02-10', '2026-03-20'],
      ['2026-03-21', '2026-04-30'],
    ]);
    // Fora do período na obra ela não conta, antes nem depois da troca.
    expect(comQuantidade(await efetivoPessoal('2026-05-01'))).toEqual([]);
  });

  it('não muda o cadastro de pessoa: a função mora na passagem', async () => {
    // Decisão 29.1. Se a coluna continuasse em `pessoa`, haveria duas
    // verdades sobre a mesma função, e elas divergiriam na primeira troca.
    const pessoaId = await pessoaQueTrocouDeFuncao();

    // `information_schema` no lugar de `pragma_table_info`: o banco é Postgres
    // desde 17/09/2026 e o PRAGMA do SQLite não existe aqui. A pergunta é a
    // mesma — a coluna está na tabela? —, e continua sendo feita ao banco, que
    // é a única fonte que não pode mentir sobre o layout físico.
    const colunas = await cenario.conexao.consulta<{ nome: string }>(
      `SELECT column_name AS nome FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      ['pessoa'],
    );
    expect(colunas.map((linha) => linha.nome)).not.toContain('funcao_id');

    const funcoesDasPassagens = await cenario.conexao.consulta<{ termo: string }>(
      `SELECT f.termo AS termo FROM passagem_pessoa pp
         JOIN funcao f ON f.id = pp.funcao_id
         WHERE pp.pessoa_id = $1 ORDER BY pp.entrada`,
      [pessoaId],
    );
    expect(funcoesDasPassagens.map((linha) => linha.termo)).toEqual([
      'Motorista',
      'Operador II',
    ]);
  });

  it('recusa a troca numa data que nenhuma passagem cobre', async () => {
    const criada = await cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const resultado = await troca(criada.valor, 'Operador II', '2026-03-21');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.NAO_ENCONTRADO);
  });

  it('recusa a troca no próprio dia de entrada da passagem', async () => {
    // Não há período anterior para preservar: encerrar a passagem na véspera
    // criaria uma passagem de saída anterior à entrada, o período de −716 dias
    // da planilha em miniatura (caso obrigatório 2).
    const criada = await cadastra('P1', 'Motorista', '2026-02-10');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const resultado = await troca(criada.valor, 'Operador II', '2026-02-10');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL);
  });

  it('recusa a troca para uma função fora do cadastro, sem criar termo', async () => {
    // R13: foi assim que a planilha ganhou `Servente ` e `Servente` como duas
    // funções diferentes.
    const criada = await cadastra('P1', 'Motorista', '2026-02-10');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const resultado = await troca(criada.valor, 'Encanador', '2026-03-21');

    expect(resultado.ok).toBe(false);
    const funcoes = await listaFuncoesParaEfetivo(paraTaxonomia(cenario.amb));
    expect(funcoes.ok && funcoes.valor.some((f) => f.termo === 'Encanador')).toBe(false);
  });

  it('deixa o cadastro intacto quando a troca é recusada', async () => {
    // Recusa que grava metade é pior que recusa: as duas passagens nascem na
    // mesma transação.
    const criada = await cadastra('P1', 'Motorista', '2026-02-10');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    expect((await troca(criada.valor, 'Encanador', '2026-03-21')).ok).toBe(false);

    const lista = await listaPessoalProtegida(e1, obraId, cenario.amb);
    expect(
      lista.ok && lista.valor[0]?.passagens.map((p) => [p.funcaoTermo, p.saida]),
    ).toEqual([['Motorista', null]]);
  });

  it('recusa a troca de pessoa que não é desta obra', async () => {
    const resultado = await troca(
      '00000000-0000-4000-8000-000000000000',
      'Operador II',
      '2026-03-21',
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.NAO_ENCONTRADO);
  });
});
