/**
 * As fronteiras do efetivo, do cadastro de verdade até a agregação do RDO.
 *
 * **A agregação do efetivo vive num lugar só:** `src/modules/rdo/efetivo.ts`.
 * Havia duas — uma em `pessoal`/`equipamento` e outra no `rdo` —, com formatos
 * diferentes: a primeira devolvia só as funções com gente, a segunda devolve
 * todas as colunas do cadastro com zero em branco. Duas agregações do mesmo
 * número é a divergência que a planilha legada provou ser cara, e a segunda foi
 * removida na integração das frentes.
 *
 * `rdo-efetivo.test.ts` já trava essas fronteiras contra duplas. Este arquivo
 * responde à outra pergunta: **o que o banco entrega chega íntegro à
 * agregação?** Cadastro real, repositório real, agregação real.
 *
 * Origem das expectativas — nenhuma lida da implementação:
 *
 * - `regras-extraidas.md` §1 e decisão 1.1: conta quem tem `entrada <= D` e
 *   (`saída` nula ou `saída >= D`). A saída é o **último dia trabalhado**;
 * - decisão 1.2: equipamento segue exatamente a mesma regra;
 * - R3 e caso obrigatório 8: quem sai e volta tem duas passagens e conta uma;
 * - gabarito, bloco 5: todas as colunas do cadastro, quantidade zero **em
 *   branco**, `TOTAL` somando tudo;
 * - decisão 17.1: espaço no fim do rótulo é recortado (`Servente ` vira
 *   `Servente`); espaço no meio, não.
 *
 * Dado sintético: `P1`, `P2`, `P3` são rótulos do PRD, não pessoas.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraTaxonomia } from '../src/app/_composicao/ambiente-de-cadastro';
import {
  cadastraEquipamentoProtegido,
  cadastraPessoaProtegida,
  listaMobilizacaoDeEquipamentoProtegida,
  listaMobilizacaoDePessoalProtegida,
  registraPassagemDeEquipamentoProtegida,
  registraPassagemProtegida,
} from '../src/app/_composicao/cadastro';
import type { Ator } from '../src/modules/acesso';
import {
  calculaEfetivoDeEquipamento,
  calculaEfetivoPessoal,
  type BlocoDeEfetivo,
} from '../src/modules/rdo/efetivo';
import { listaFuncoesParaEfetivo } from '../src/modules/taxonomia';
import { diaPuroConfiavel } from '../src/shared/date/dia';
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

function cadastraEquipamento(
  identificador: string,
  tipo: string,
  entrada: string,
  saida?: string,
) {
  return cadastraEquipamentoProtegido(
    e1,
    obraId,
    saida === undefined
      ? { identificador, tipo, entrada }
      : { identificador, tipo, entrada, saida },
    cenario.amb,
  );
}

/** O bloco 5 como o RDO o monta, com as colunas do cadastro e o total. */
function efetivoPessoal(dia: string, eDiaParado = false): BlocoDeEfetivo {
  const mobilizacao = await listaMobilizacaoDePessoalProtegida(e1, obraId, cenario.amb);
  if (!mobilizacao.ok) throw new Error(mobilizacao.erro.mensagem);
  const funcoes = await listaFuncoesParaEfetivo(paraTaxonomia(cenario.amb));
  if (!funcoes.ok) throw new Error(funcoes.erro.mensagem);

  return await calculaEfetivoPessoal(
    funcoes.valor,
    mobilizacao.valor,
    diaPuroConfiavel(dia),
    eDiaParado,
  );
}

function efetivoDeEquipamento(dia: string, eDiaParado = false): BlocoDeEfetivo {
  const mobilizacao = await listaMobilizacaoDeEquipamentoProtegida(
    e1,
    obraId,
    cenario.amb,
  );
  if (!mobilizacao.ok) throw new Error(mobilizacao.erro.mensagem);
  return await calculaEfetivoDeEquipamento(
    mobilizacao.valor,
    diaPuroConfiavel(dia),
    eDiaParado,
  );
}

/** Só o que tem gente, para que a expectativa fale da regra e não do cadastro. */
function comQuantidade(bloco: BlocoDeEfetivo): [string, number][] {
  return bloco.colunas
    .filter((c) => c.quantidade > 0)
    .map((c) => [c.rotulo, c.quantidade]);
}

describe('efetivo de pessoal: as fronteiras da regra R1 contra o cadastro', () => {
  it('conta quem entrou antes e ainda não saiu', async () => {
    expect(cadastra('P2', 'Motorista', '2026-02-05').ok).toBe(true);
    expect(comQuantidade(efetivoPessoal('2026-09-01'))).toEqual([['Motorista', 1]]);
  });

  it('conta a pessoa no próprio dia da entrada', async () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    expect(comQuantidade(efetivoPessoal('2026-02-10'))).toEqual([['Motorista', 1]]);
  });

  it('não conta a pessoa no dia anterior à entrada', async () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    expect(comQuantidade(efetivoPessoal('2026-02-09'))).toEqual([]);
  });

  it('conta a pessoa no dia da saída, porque a saída é o último dia trabalhado', async () => {
    // Decisão 1.1, de 16/09/2026. A planilha faz dos dois jeitos ao mesmo
    // tempo; aqui a resposta é uma só.
    expect(cadastra('P1', 'Motorista', '2026-02-10', '2026-02-20').ok).toBe(true);
    expect(comQuantidade(efetivoPessoal('2026-02-20'))).toEqual([['Motorista', 1]]);
  });

  it('não conta a pessoa no dia seguinte à saída', async () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10', '2026-02-20').ok).toBe(true);
    expect(comQuantidade(efetivoPessoal('2026-02-21'))).toEqual([]);
  });

  it('conta uma vez quem tem duas passagens, e não duas', async () => {
    // Caso obrigatório 8: contar linhas de cadastro daria dois, e o efetivo do
    // RDO sairia dobrado.
    const criada = await cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;
    // A passagem nova pede função: ela é atributo da passagem (decisão 29.1).
    registraPassagemProtegida(
      e1,
      obraId,
      { pessoaId: criada.valor, funcao: 'Motorista', entrada: '2026-03-15' },
      cenario.amb,
    );

    expect(comQuantidade(efetivoPessoal('2026-03-20'))).toEqual([['Motorista', 1]]);
    // Entre as duas passagens ela não está na obra.
    expect(comQuantidade(efetivoPessoal('2026-03-01'))).toEqual([]);
  });

  it('agrega por função e soma duas pessoas da mesma função', async () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    expect(cadastra('P2', 'Motorista', '2026-02-10').ok).toBe(true);
    expect(cadastra('P3', 'Servente', '2026-02-10').ok).toBe(true);

    const bloco = efetivoPessoal('2026-02-15');
    expect(bloco.colunas.find((c) => c.rotulo === 'Motorista')?.quantidade).toBe(2);
    expect(bloco.colunas.find((c) => c.rotulo === 'Servente')?.quantidade).toBe(1);
    expect(bloco.total).toBe(3);
  });
});

describe('efetivo de pessoal: o formato do bloco 5', () => {
  it('mantém a coluna de toda função do cadastro, mesmo sem ninguém', async () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    const bloco = efetivoPessoal('2026-02-15');

    // As 12 funções da carga inicial (decisão 19.1). A coluna existe mesmo
    // vazia: é o que o fiscal vê no papel há meses.
    expect(bloco.colunas).toHaveLength(12);
    expect(bloco.colunas.some((c) => c.rotulo === 'Topografo')).toBe(true);
  });

  it('exibe a quantidade zero em branco, e não como 0', async () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    const bloco = efetivoPessoal('2026-02-15');

    expect(bloco.colunas.find((c) => c.rotulo === 'Motorista')?.texto).toBe('1');
    expect(bloco.colunas.find((c) => c.rotulo === 'Servente')?.texto).toBe('');
  });

  it('não carrega nome de trabalhador nenhum', async () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    expect(JSON.stringify(efetivoPessoal('2026-02-15'))).not.toContain('P1');
  });

  it('zera o bloco inteiro no dia parado, e o TOTAL vai a zero', async () => {
    // Decisão 5.1: o efetivo é o mobilizado e sai zerado no dia parado. Quem
    // zera é o `rdo`, que é quem conhece o estado do dia.
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    const bloco = efetivoPessoal('2026-02-15', true);

    expect(bloco.total).toBe(0);
    expect(bloco.colunas.every((c) => c.texto === '')).toBe(true);
  });
});

describe('efetivo de equipamento: a mesma regra, por identificador (1.2)', () => {
  it('conta o equipamento no próprio dia da entrada', async () => {
    expect(cadastraEquipamento('CF-29', 'PATROL', '2026-02-05').ok).toBe(true);
    expect(comQuantidade(efetivoDeEquipamento('2026-02-05'))).toEqual([['CF-29', 1]]);
  });

  it('não conta o equipamento no dia anterior à entrada', async () => {
    expect(cadastraEquipamento('CF-29', 'PATROL', '2026-02-05').ok).toBe(true);
    expect(comQuantidade(efetivoDeEquipamento('2026-02-04'))).toEqual([]);
  });

  it('conta o equipamento no dia da saída, pela mesma regra da pessoa', async () => {
    // Decisão 1.2: acabou a divergência da planilha, que tinha três
    // comportamentos diferentes para o bloco de equipamento.
    expect(cadastraEquipamento('CF-29', 'PATROL', '2026-02-05', '2026-02-18').ok).toBe(
      true,
    );
    expect(comQuantidade(efetivoDeEquipamento('2026-02-18'))).toEqual([['CF-29', 1]]);
  });

  it('não conta o equipamento no dia seguinte à saída', async () => {
    expect(cadastraEquipamento('CF-29', 'PATROL', '2026-02-05', '2026-02-18').ok).toBe(
      true,
    );
    expect(comQuantidade(efetivoDeEquipamento('2026-02-19'))).toEqual([]);
  });

  it('conta uma vez o equipamento que tem duas passagens', async () => {
    const criado = await cadastraEquipamento(
      'MT-26',
      'BASCULA',
      '2026-02-05',
      '2026-02-18',
    );
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;
    registraPassagemDeEquipamentoProtegida(
      e1,
      obraId,
      { equipamentoId: criado.valor, entrada: '2026-03-01' },
      cenario.amb,
    );

    expect(comQuantidade(efetivoDeEquipamento('2026-03-05'))).toEqual([['MT-26', 1]]);
    expect(comQuantidade(efetivoDeEquipamento('2026-02-25'))).toEqual([]);
  });

  it('mantém a coluna do equipamento fora da obra, com a célula em branco', async () => {
    expect(cadastraEquipamento('CF-29', 'PATROL', '2026-02-05', '2026-02-18').ok).toBe(
      true,
    );
    const bloco = efetivoDeEquipamento('2026-02-19');

    expect(bloco.colunas.map((c) => c.rotulo)).toEqual(['CF-29']);
    expect(bloco.colunas[0]?.texto).toBe('');
    expect(bloco.total).toBe(0);
  });
});
