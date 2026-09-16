/**
 * CT-027 a CT-040 — Pessoal e passagem (`docs/qa/v1-casos-passos-1-3.md`,
 * F2.1), mais as fronteiras obrigatórias do efetivo.
 *
 * Origem das expectativas: PRD, Funcionalidade 2.1; decisões 1.1 e 19.2;
 * R1, R2, R3, R13 e R14; `regras-extraidas.md` §1; casos obrigatórios 1, 2, 8,
 * 10, 13 e 14 da skill `template-caso-teste`.
 *
 * O bloco de fronteira do efetivo existe porque `padroes-codigo` exige valor
 * de fronteira em **todo** cálculo de agregação, e porque a planilha legada
 * responde `≤` numa faixa de colunas e `<` em outra: qual resposta você recebia
 * dependia de onde a sua função tinha caído.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraPessoal, paraTaxonomia } from '../../app/_composicao/ambiente-de-cadastro';
import {
  cadastraPessoaProtegida,
  contaEfetivoPorFuncaoProtegido,
  listaPessoalProtegida,
  registraPassagemProtegida,
} from '../../app/_composicao/cadastro';
import { listaTermos } from '../../modules/taxonomia';
import { diaPuroConfiavel } from '../../shared/date/dia';
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
  e1 = cenario.novoAtor('e1@exemplo.invalido');
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

function efetivo(dia: string) {
  const resultado = contaEfetivoPorFuncaoProtegido(
    e1,
    obraId,
    diaPuroConfiavel(dia),
    cenario.amb,
  );
  if (!resultado.ok) throw new Error(resultado.erro.mensagem);
  return resultado.valor;
}

describe('F2.1 — cadastro de pessoal e passagens', () => {
  it('CT-027 cadastra a pessoa com uma passagem em aberto', () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);

    const lista = listaPessoalProtegida(e1, obraId, cenario.amb);
    expect(lista.ok).toBe(true);
    if (!lista.ok) return;

    const p1 = lista.valor.find((p) => p.nome === 'P1');
    expect(p1?.passagens).toEqual([
      { id: p1?.passagens[0]?.id, entrada: '2026-02-10', saida: null },
    ]);
  });

  it('CT-028 guarda a função como referência ao termo, não como texto copiado', () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);

    const termos = listaTermos('funcao', paraTaxonomia(cenario.amb));
    expect(termos.ok).toBe(true);
    if (!termos.ok) return;
    const motorista = termos.valor.find((t) => t.termo === 'Motorista');

    const linha = cenario.conexao.sqlite
      .prepare('SELECT funcao_id FROM pessoa WHERE nome = ?')
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

    const lista = listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(lista.ok && lista.valor.find((p) => p.nome === 'P5')?.funcaoTermo).toBe(
      'Motorista',
    );
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
      { id: expect.any(String), entrada: '2026-02-10', saida: '2026-02-10' },
    ]);
  });

  it('CT-033 quem sai e volta tem duas passagens e continua sendo uma pessoa', () => {
    const criada = cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const segunda = registraPassagemProtegida(
      e1,
      obraId,
      { pessoaId: criada.valor, entrada: '2026-03-15' },
      cenario.amb,
    );
    expect(segunda.ok).toBe(true);

    const lista = listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(lista.ok && lista.valor).toHaveLength(1);
    expect(lista.ok && lista.valor[0]?.passagens).toHaveLength(2);
  });

  it('CT-034 recusa a lista de pessoal ao encarregado, e a resposta não traz nome', () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    const c1 = daAcessoDeEncarregado(
      cenario.novoAtor('c1@exemplo.invalido'),
      '55555555-5555-4555-8555-555555555555',
    );

    const resultado = listaPessoalProtegida(c1, obraId, cenario.amb);

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

describe('efetivo por função — fronteiras da regra R1', () => {
  it('CT-040 conta quem entrou antes e ainda não saiu', () => {
    expect(cadastra('P2', 'Motorista', '2026-02-05').ok).toBe(true);

    expect(efetivo('2026-09-01')).toEqual([
      { funcaoId: expect.any(String), termo: 'Motorista', quantidade: 1 },
    ]);
  });

  it('conta a pessoa no próprio dia da entrada', () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    expect(efetivo('2026-02-10')[0]?.quantidade).toBe(1);
  });

  it('não conta a pessoa no dia anterior à entrada', () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    expect(efetivo('2026-02-09')).toEqual([]);
  });

  it('conta a pessoa no dia da saída, porque a saída é o último dia trabalhado', () => {
    // Decisão 1.1, de 16/09/2026. A planilha faz dos dois jeitos ao mesmo
    // tempo; aqui a resposta é uma só.
    expect(cadastra('P1', 'Motorista', '2026-02-10', '2026-02-20').ok).toBe(true);
    expect(efetivo('2026-02-20')[0]?.quantidade).toBe(1);
  });

  it('não conta a pessoa no dia seguinte à saída', () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10', '2026-02-20').ok).toBe(true);
    expect(efetivo('2026-02-21')).toEqual([]);
  });

  it('conta uma vez quem tem duas passagens, e não duas', () => {
    // Caso obrigatório 8: contar linhas de cadastro daria dois, e o efetivo do
    // RDO sairia dobrado.
    const criada = cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;
    registraPassagemProtegida(
      e1,
      obraId,
      { pessoaId: criada.valor, entrada: '2026-03-15' },
      cenario.amb,
    );

    expect(efetivo('2026-03-20')[0]?.quantidade).toBe(1);
    // Entre as duas passagens ela não está na obra.
    expect(efetivo('2026-03-01')).toEqual([]);
  });

  it('agrega por função e soma duas pessoas da mesma função', () => {
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    expect(cadastra('P2', 'Motorista', '2026-02-10').ok).toBe(true);
    expect(cadastra('P3', 'Servente', '2026-02-10').ok).toBe(true);

    const resultado = efetivo('2026-02-15');
    expect(resultado.find((e) => e.termo === 'Motorista')?.quantidade).toBe(2);
    expect(resultado.find((e) => e.termo === 'Servente')?.quantidade).toBe(1);
  });

  it('o efetivo não tem campo de nome de trabalhador', () => {
    // R2 e LGPD: o documento que circula não precisa dizer quem trabalhou.
    expect(cadastra('P1', 'Motorista', '2026-02-10').ok).toBe(true);
    const linha = efetivo('2026-02-15')[0];

    expect(Object.keys(linha ?? {})).toEqual(['funcaoId', 'termo', 'quantidade']);
    expect(JSON.stringify(efetivo('2026-02-15'))).not.toContain('P1');
  });
});
