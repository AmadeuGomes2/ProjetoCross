/**
 * CT-027 a CT-040 — Pessoal e passagem (`docs/qa/v1-casos-passos-1-3.md`,
 * F2.1), mais as fronteiras obrigatórias do efetivo.
 *
 * Origem das expectativas: PRD, Funcionalidade 2.1; decisões 1.1 e 19.2;
 * R1, R2, R3, R13 e R14; `regras-extraidas.md` §1; casos obrigatórios 1, 2, 8,
 * 10, 13 e 14 da skill `template-caso-teste`.
 *
 * As fronteiras do efetivo **não moram mais aqui**: `pessoal` entrega a
 * mobilização crua e quem conta é `src/modules/rdo/efetivo.ts`, num lugar só.
 * Os valores de fronteira da regra R1 contra o cadastro de verdade estão em
 * `test/efetivo-do-rdo.test.ts`, e contra duplas em `rdo-efetivo.test.ts`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraPessoal, paraTaxonomia } from '../../app/_composicao/ambiente-de-cadastro';
import {
  cadastraPessoaProtegida,
  listaMobilizacaoDePessoalProtegida,
  listaPessoalProtegida,
  registraPassagemProtegida,
} from '../../app/_composicao/cadastro';
import { listaTermos } from '../../modules/taxonomia';
import { CODIGO_ERRO } from '../../shared/result';
import {
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import type { Ator } from '../../modules/acesso';
import type { ObraId } from '../../shared/id';
import { listaPessoalDaObra } from './casos-de-uso';

let cenario: Cenario;
let e1: Ator;
let obraId: ObraId;

beforeEach(() => {
  cenario = montaCenario();
  e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
  obraId = criaObraDoPrd(e1, cenario.amb);
});

afterEach(() => {
  cenario.fecha();
});

function cadastra(nome: string, funcao: string, entrada: string, saida?: string | null) {
  return cadastraPessoaProtegida(
    e1,
    obraId,
    saida === undefined ? { nome, funcao, entrada } : { nome, funcao, entrada, saida },
    cenario.amb,
  );
}

/** Liberação de encarregado por SQL cru: o convite tem teste próprio. */
function daAcessoDeEncarregado(ator: Ator, acessoId: string): Ator {
  cenario.conexao.sqlite
    .prepare(
      `INSERT INTO acesso (id, obra_id, usuario_id, perfil, liberado_por, liberado_em)
       VALUES (?, ?, ?, 'encarregado', ?, ?)`,
    )
    .run(acessoId, obraId, ator.usuarioId, e1.usuarioId, '2026-09-16T12:00:00.000Z');
  return ator;
}

describe('F2.1 — cadastro de pessoal e passagens', () => {
  it('CT-027 cadastra a pessoa com uma passagem em aberto', () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);

    const lista = listaPessoalProtegida(e1, obraId, cenario.amb);
    expect(lista.ok).toBe(true);
    if (!lista.ok) return;

    const p1 = lista.valor.find((p) => p.nome === 'P1');
    expect(p1?.passagens).toEqual([
      {
        id: p1?.passagens[0]?.id,
        funcaoId: p1?.passagens[0]?.funcaoId,
        funcaoTermo: 'Motorista',
        entrada: '2026-02-10',
        saida: null,
      },
    ]);
  });

  it('CT-028 guarda a função como referência ao termo, não como texto copiado', () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);

    const termos = listaTermos('funcao', paraTaxonomia(cenario.amb));
    expect(termos.ok).toBe(true);
    if (!termos.ok) return;
    const motorista = termos.valor.find((t) => t.termo === 'Motorista');

    // A referência fica na PASSAGEM (decisão 29.1), não no cadastro da pessoa.
    const linha = cenario.conexao.sqlite
      .prepare(
        `SELECT pp.funcao_id AS funcao_id FROM passagem_pessoa pp
         JOIN pessoa p ON p.id = pp.pessoa_id WHERE p.nome = ?`,
      )
      .get('P1') as { funcao_id: string };
    expect(linha.funcao_id).toBe(motorista?.id);
  });

  it('CT-029 liga "Motorista " (espaço no fim) ao termo existente, sem criar outro', () => {
    const antes = listaTermos('funcao', paraTaxonomia(cenario.amb));
    expect(cadastra('P2', 'Motorista ', '2026-02-10').ok).toBe(true);
    const depois = listaTermos('funcao', paraTaxonomia(cenario.amb));

    expect(antes.ok && depois.ok && depois.valor.length).toBe(
      antes.ok ? antes.valor.length : -1,
    );
    expect(depois.ok && depois.valor.filter((t) => t.termo === 'Motorista')).toHaveLength(
      1,
    );
  });

  it('CT-030 liga "motorista" em caixa baixa ao termo existente', () => {
    expect(cadastra('P5', 'motorista', '2026-02-10').ok).toBe(true);

    const termos = listaTermos('funcao', paraTaxonomia(cenario.amb));
    expect(termos.ok).toBe(true);
    if (!termos.ok) return;
    expect(
      termos.valor.filter((t) => t.termo.toLowerCase() === 'motorista'),
    ).toHaveLength(1);

    // A função exibida é a da passagem, não a do cadastro da pessoa
    // (decisão 29.1), e sai com a grafia oficial do cadastro.
    const lista = listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(
      lista.ok &&
        lista.valor.find((p) => p.nome === 'P5')?.passagens.map((p) => p.funcaoTermo),
    ).toEqual(['Motorista']);
  });

  it('CT-031 recusa saída anterior à entrada e diz o que corrigir', () => {
    const resultado = cadastra('P3', 'Motorista', '2026-02-10', '2026-02-09');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL);
    expect(resultado.erro.mensagem).toBe(
      'A data de saída não pode ser anterior à data de entrada.',
    );
  });

  it('CT-032 aceita saída no mesmo dia da entrada, com passagem de um dia', () => {
    expect(cadastra('P4', 'Motorista', '2026-02-10', '2026-02-10').ok).toBe(true);

    const lista = listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(lista.ok && lista.valor.find((p) => p.nome === 'P4')?.passagens).toEqual([
      {
        id: expect.any(String),
        funcaoId: expect.any(String),
        funcaoTermo: 'Motorista',
        entrada: '2026-02-10',
        saida: '2026-02-10',
      },
    ]);
  });

  it('CT-033 quem sai e volta tem duas passagens e continua sendo uma pessoa', () => {
    const criada = cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const segunda = registraPassagemProtegida(
      e1,
      obraId,
      { pessoaId: criada.valor, funcao: 'Motorista', entrada: '2026-03-15' },
      cenario.amb,
    );
    expect(segunda.ok).toBe(true);

    const lista = listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(lista.ok && lista.valor).toHaveLength(1);
    expect(lista.ok && lista.valor[0]?.passagens).toHaveLength(2);
  });

  it('quem volta à obra pode voltar em outra função, sem mexer na passagem antiga', () => {
    // Decisão 29.1: a função é da passagem. Duas passagens da mesma pessoa
    // podem ter funções diferentes, e a primeira continua como estava.
    const criada = cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const segunda = registraPassagemProtegida(
      e1,
      obraId,
      { pessoaId: criada.valor, funcao: 'Operador II', entrada: '2026-03-15' },
      cenario.amb,
    );
    expect(segunda.ok).toBe(true);

    const lista = listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(lista.ok && lista.valor[0]?.passagens.map((p) => p.funcaoTermo)).toEqual([
      'Motorista',
      'Operador II',
    ]);
  });

  it('recusa abrir passagem sem função', () => {
    // Sem função a passagem não tem coluna no bloco 5 e some do RDO em
    // silêncio (CT-036, agora do lado da passagem).
    const criada = cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const segunda = registraPassagemProtegida(
      e1,
      obraId,
      { pessoaId: criada.valor, funcao: '', entrada: '2026-03-15' },
      cenario.amb,
    );

    expect(segunda.ok).toBe(false);
    if (segunda.ok) return;
    expect(segunda.erro.codigo).toBe(CODIGO_ERRO.TERMO_VAZIO);
  });

  it('recusa a passagem sobreposta com o código de sobreposição, e não com o de ordem invertida', () => {
    // Origem: `src/shared/result`, CODIGO_ERRO.INTERVALO_SOBREPOSTO — "não
    // confundir com DATA_FINAL_ANTES_DA_INICIAL, que é um intervalo só,
    // invertido". Aqui são dois intervalos brigando, e a mensagem exibida
    // precisa combinar com o código gravado no log.
    const criada = cadastra('P7', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const segunda = registraPassagemProtegida(
      e1,
      obraId,
      { pessoaId: criada.valor, funcao: 'Motorista', entrada: '2026-02-20' },
      cenario.amb,
    );

    expect(segunda.ok).toBe(false);
    if (segunda.ok) return;
    expect(segunda.erro.codigo).toBe(CODIGO_ERRO.INTERVALO_SOBREPOSTO);
    expect(segunda.erro.mensagem).toBe(
      'Já existe uma passagem nesta obra cobrindo esse intervalo. Encerre a anterior antes.',
    );
  });

  /*
   * CT-034 mudou em 17/09/2026, por decisão do dono do produto.
   *
   * A lista era exclusiva do engenheiro porque é nominal, e nome de
   * trabalhador é dado pessoal sob a LGPD. O encarregado passa a **ler**: ele
   * convive com essas pessoas todo dia e precisa conferir quem está
   * mobilizado. O que não mudou é que ele não escreve — CT-035 abaixo.
   *
   * A fronteira que importa continua sendo a da OBRA, e é o segundo caso.
   */
  it('CT-034 deixa o encarregado LER a lista de pessoal da obra dele', () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    const c1 = daAcessoDeEncarregado(
      cenario.novoAtor('c1@exemplo.invalido'),
      '55555555-5555-4555-8555-555555555555',
    );

    const resultado = listaPessoalProtegida(c1, obraId, cenario.amb);

    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.valor).toHaveLength(1);
  });

  it('CT-034b recusa a lista a quem não tem acesso à obra, e não vaza nome', () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    const estranho = cenario.novoAtor('estranho@exemplo.invalido');

    const resultado = listaPessoalProtegida(estranho, obraId, cenario.amb);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(JSON.stringify(resultado.erro)).not.toContain('P1');
  });

  it('CT-035 recusa no servidor o cadastro de pessoa enviado por encarregado', () => {
    const c1 = daAcessoDeEncarregado(
      cenario.novoAtor('c1@exemplo.invalido'),
      '66666666-6666-4666-8666-666666666666',
    );

    const resultado = cadastraPessoaProtegida(
      c1,
      obraId,
      { nome: 'P9', funcao: 'Motorista', entrada: '2026-02-10' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    const lista = listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(lista.ok && lista.valor).toHaveLength(0);
  });

  it('CT-036 recusa pessoa sem função', () => {
    const resultado = cadastraPessoaProtegida(
      e1,
      obraId,
      { nome: 'P6', funcao: '', entrada: '2026-02-10' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
  });

  it('CT-037 recusa função fora da taxonomia e não cria termo por efeito colateral', () => {
    const antes = listaTermos('funcao', paraTaxonomia(cenario.amb));
    const resultado = cadastra('P7', 'Encanador', '2026-02-10');
    const depois = listaTermos('funcao', paraTaxonomia(cenario.amb));

    expect(resultado.ok).toBe(false);
    expect(depois.ok && depois.valor.some((t) => t.termo === 'Encanador')).toBe(false);
    expect(depois.ok && depois.valor.length).toBe(antes.ok ? antes.valor.length : -1);
  });

  it('CT-038 recusa entrada em 31/09/2026, que não existe no calendário', () => {
    const resultado = cadastra('P8', 'Motorista', '2026-09-31');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
  });

  it('CT-039 recusa passagem sem data de entrada', () => {
    const resultado = cadastraPessoaProtegida(
      e1,
      obraId,
      { nome: 'P8', funcao: 'Motorista', entrada: '' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DIA_INVALIDO);
  });
});

describe('a mobilização que o RDO recebe', () => {
  it('entrega as passagens da pessoa sem nenhum campo de nome', () => {
    // R2 e LGPD: o documento que circula não precisa dizer quem trabalhou. O
    // vazamento é impossível pelo TIPO, não por disciplina de tela.
    //
    // **A contagem do efetivo não está aqui, e é de propósito.** Ela vive em
    // `src/modules/rdo/efetivo.ts`, num lugar só, e as fronteiras da regra R1
    // estão em `test/efetivo-do-rdo.test.ts`, contra o cadastro de verdade.
    expect(cadastra('P1', 'Motorista', '2026-02-10', '2026-02-20').ok).toBe(true);

    const mobilizacao = listaMobilizacaoDePessoalProtegida(e1, obraId, cenario.amb);
    expect(mobilizacao.ok).toBe(true);
    if (!mobilizacao.ok) return;

    expect(Object.keys(mobilizacao.valor[0] ?? {})).toEqual(['pessoaId', 'passagens']);
    // A função vem por passagem (decisão 29.1), nunca uma só na pessoa.
    expect(mobilizacao.valor[0]?.passagens).toEqual([
      { funcaoId: expect.any(String), entrada: '2026-02-10', saida: '2026-02-20' },
    ]);
    expect(JSON.stringify(mobilizacao.valor)).not.toContain('P1');
  });

  it('junta as duas passagens de quem sai e volta na mesma pessoa', () => {
    // Caso obrigatório 8: duas linhas de cadastro, uma pessoa só.
    const criada = cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;
    registraPassagemProtegida(
      e1,
      obraId,
      { pessoaId: criada.valor, funcao: 'Motorista', entrada: '2026-03-15' },
      cenario.amb,
    );

    const mobilizacao = listaMobilizacaoDePessoalProtegida(e1, obraId, cenario.amb);
    expect(mobilizacao.ok && mobilizacao.valor).toHaveLength(1);
    expect(mobilizacao.ok && mobilizacao.valor[0]?.passagens).toHaveLength(2);
  });
});
