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
 *
 * O banco é Postgres desde 17/09/2026, então tudo que toca o banco é
 * assíncrono: `criaBancoDeTeste` e os casos de uso devolvem promessa, e
 * `conexao.sqlite` não existe mais — a leitura crua passa pelo Drizzle, que
 * ainda por cima tipa o resultado e dispensa o `as` que havia aqui.
 */

import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraPessoal, paraTaxonomia } from '../../app/_composicao/ambiente-de-cadastro';
import {
  cadastraPessoaProtegida,
  listaMobilizacaoDePessoalProtegida,
  listaPessoalProtegida,
  registraPassagemProtegida,
} from '../../app/_composicao/cadastro';
import { acesso, passagemPessoa, pessoa } from '../../db/schema';
import { listaTermos } from '../../modules/taxonomia';
import { CODIGO_ERRO } from '../../shared/result';
import {
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import type { Ator } from '../../modules/acesso';
import { idConfiavel, type ObraId } from '../../shared/id';
import { listaPessoalDaObra } from './casos-de-uso';

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

async function cadastra(
  nome: string,
  funcao: string,
  entrada: string,
  saida?: string | null,
) {
  return await cadastraPessoaProtegida(
    e1,
    obraId,
    saida === undefined ? { nome, funcao, entrada } : { nome, funcao, entrada, saida },
    cenario.amb,
  );
}

/** Liberação de encarregado direto na tabela: o convite tem teste próprio. */
async function daAcessoDeEncarregado(ator: Ator, acessoId: string): Promise<Ator> {
  await cenario.conexao.db.insert(acesso).values({
    id: idConfiavel<'acesso'>(acessoId),
    obraId,
    usuarioId: ator.usuarioId,
    perfil: 'encarregado',
    liberadoPor: e1.usuarioId,
    liberadoEm: '2026-09-16T12:00:00.000Z',
  });
  return ator;
}

describe('F2.1 — cadastro de pessoal e passagens', () => {
  it('CT-027 cadastra a pessoa com uma passagem em aberto', async () => {
    expect((await cadastra('P1', 'Motorista', '2026-02-10')).ok).toBe(true);

    const lista = await listaPessoalProtegida(e1, obraId, cenario.amb);
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

  it('CT-028 guarda a função como referência ao termo, não como texto copiado', async () => {
    expect((await cadastra('P1', 'Motorista', '2026-02-10')).ok).toBe(true);

    const termos = await listaTermos('funcao', paraTaxonomia(cenario.amb));
    expect(termos.ok).toBe(true);
    if (!termos.ok) return;
    const motorista = termos.valor.find((t) => t.termo === 'Motorista');

    // A referência fica na PASSAGEM (decisão 29.1), não no cadastro da pessoa.
    const [linha] = await cenario.conexao.db
      .select({ funcaoId: passagemPessoa.funcaoId })
      .from(passagemPessoa)
      .innerJoin(pessoa, eq(pessoa.id, passagemPessoa.pessoaId))
      .where(eq(pessoa.nome, 'P1'));
    expect(linha?.funcaoId).toBe(motorista?.id);
  });

  it('CT-029 liga "Motorista " (espaço no fim) ao termo existente, sem criar outro', async () => {
    const antes = await listaTermos('funcao', paraTaxonomia(cenario.amb));
    expect((await cadastra('P2', 'Motorista ', '2026-02-10')).ok).toBe(true);
    const depois = await listaTermos('funcao', paraTaxonomia(cenario.amb));

    expect(antes.ok && depois.ok && depois.valor.length).toBe(
      antes.ok ? antes.valor.length : -1,
    );
    expect(depois.ok && depois.valor.filter((t) => t.termo === 'Motorista')).toHaveLength(
      1,
    );
  });

  it('CT-030 liga "motorista" em caixa baixa ao termo existente', async () => {
    expect((await cadastra('P5', 'motorista', '2026-02-10')).ok).toBe(true);

    const termos = await listaTermos('funcao', paraTaxonomia(cenario.amb));
    expect(termos.ok).toBe(true);
    if (!termos.ok) return;
    expect(
      termos.valor.filter((t) => t.termo.toLowerCase() === 'motorista'),
    ).toHaveLength(1);

    // A função exibida é a da passagem, não a do cadastro da pessoa
    // (decisão 29.1), e sai com a grafia oficial do cadastro.
    const lista = await listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(
      lista.ok &&
        lista.valor.find((p) => p.nome === 'P5')?.passagens.map((p) => p.funcaoTermo),
    ).toEqual(['Motorista']);
  });

  it('CT-031 recusa saída anterior à entrada e diz o que corrigir', async () => {
    const resultado = await cadastra('P3', 'Motorista', '2026-02-10', '2026-02-09');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL);
    expect(resultado.erro.mensagem).toBe(
      'A data de saída não pode ser anterior à data de entrada.',
    );
  });

  it('CT-032 aceita saída no mesmo dia da entrada, com passagem de um dia', async () => {
    expect((await cadastra('P4', 'Motorista', '2026-02-10', '2026-02-10')).ok).toBe(true);

    const lista = await listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
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

  it('CT-033 quem sai e volta tem duas passagens e continua sendo uma pessoa', async () => {
    const criada = await cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const segunda = await registraPassagemProtegida(
      e1,
      obraId,
      { pessoaId: criada.valor, funcao: 'Motorista', entrada: '2026-03-15' },
      cenario.amb,
    );
    expect(segunda.ok).toBe(true);

    const lista = await listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(lista.ok && lista.valor).toHaveLength(1);
    expect(lista.ok && lista.valor[0]?.passagens).toHaveLength(2);
  });

  it('quem volta à obra pode voltar em outra função, sem mexer na passagem antiga', async () => {
    // Decisão 29.1: a função é da passagem. Duas passagens da mesma pessoa
    // podem ter funções diferentes, e a primeira continua como estava.
    const criada = await cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const segunda = await registraPassagemProtegida(
      e1,
      obraId,
      { pessoaId: criada.valor, funcao: 'Operador II', entrada: '2026-03-15' },
      cenario.amb,
    );
    expect(segunda.ok).toBe(true);

    const lista = await listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(lista.ok && lista.valor[0]?.passagens.map((p) => p.funcaoTermo)).toEqual([
      'Motorista',
      'Operador II',
    ]);
  });

  it('recusa abrir passagem sem função', async () => {
    // Sem função a passagem não tem coluna no bloco 5 e some do RDO em
    // silêncio (CT-036, agora do lado da passagem).
    const criada = await cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const segunda = await registraPassagemProtegida(
      e1,
      obraId,
      { pessoaId: criada.valor, funcao: '', entrada: '2026-03-15' },
      cenario.amb,
    );

    expect(segunda.ok).toBe(false);
    if (segunda.ok) return;
    expect(segunda.erro.codigo).toBe(CODIGO_ERRO.TERMO_VAZIO);
  });

  it('recusa a passagem sobreposta com o código de sobreposição, e não com o de ordem invertida', async () => {
    // Origem: `src/shared/result`, CODIGO_ERRO.INTERVALO_SOBREPOSTO — "não
    // confundir com DATA_FINAL_ANTES_DA_INICIAL, que é um intervalo só,
    // invertido". Aqui são dois intervalos brigando, e a mensagem exibida
    // precisa combinar com o código gravado no log.
    const criada = await cadastra('P7', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const segunda = await registraPassagemProtegida(
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
   * CT-034 e CT-035 mudaram em 17/09/2026, por decisão do dono do produto.
   *
   * A lista era exclusiva do engenheiro porque é nominal, e nome de
   * trabalhador é dado pessoal sob a LGPD. De manhã o encarregado passou a
   * **ler**: ele convive com essas pessoas todo dia e precisa conferir quem
   * está mobilizado. À tarde passou também a **escrever** — cadastrar pessoa,
   * abrir passagem e trocar de função —, porque é ele que vê quem chega e quem
   * sai do canteiro, e esperar o engenheiro transcrever é a transcrição que o
   * produto veio acabar.
   *
   * A fronteira que NENHUMA dessas decisões move é a da OBRA: quem não tem
   * acesso continua recusado, e a recusa continua sem nome. É o que travam o
   * CT-034b e o CT-035b.
   */
  it('CT-034 deixa o encarregado LER a lista de pessoal da obra dele', async () => {
    expect((await cadastra('P1', 'Motorista', '2026-02-10')).ok).toBe(true);
    const c1 = await daAcessoDeEncarregado(
      await cenario.novoAtor('c1@exemplo.invalido'),
      '55555555-5555-4555-8555-555555555555',
    );

    const resultado = await listaPessoalProtegida(c1, obraId, cenario.amb);

    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.valor).toHaveLength(1);
  });

  it('CT-034b recusa a lista a quem não tem acesso à obra, e não vaza nome', async () => {
    expect((await cadastra('P1', 'Motorista', '2026-02-10')).ok).toBe(true);
    const estranho = await cenario.novoAtor('estranho@exemplo.invalido');

    const resultado = await listaPessoalProtegida(estranho, obraId, cenario.amb);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(JSON.stringify(resultado.erro)).not.toContain('P1');
  });

  /*
   * CT-035 mudou duas vezes em 17/09/2026, e a resolução deste conflito é a
   * soma das duas: a REGRA vem da decisão da tarde — o encarregado cadastra
   * pessoa —, e a FORMA vem da migração para Postgres, que tornou tudo
   * assíncrono. As duas frentes trabalharam em paralelo e tocaram este arquivo.
   */
  it('CT-035 aceita o cadastro de pessoa enviado pelo encarregado da obra', async () => {
    const c1 = await daAcessoDeEncarregado(
      await cenario.novoAtor('c1@exemplo.invalido'),
      '66666666-6666-4666-8666-666666666666',
    );

    const resultado = await cadastraPessoaProtegida(
      c1,
      obraId,
      { nome: 'P9', funcao: 'Motorista', entrada: '2026-02-10' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(true);
    const lista = await listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(lista.ok && lista.valor.map((p) => p.nome)).toEqual(['P9']);
  });

  it('CT-035b recusa quem não tem acesso à obra, e não vaza o nome enviado', async () => {
    const estranho = await cenario.novoAtor('estranho@exemplo.invalido');

    const resultado = await cadastraPessoaProtegida(
      estranho,
      obraId,
      { nome: 'P9', funcao: 'Motorista', entrada: '2026-02-10' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(JSON.stringify(resultado.erro)).not.toContain('P9');
    const lista = await listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(lista.ok && lista.valor).toHaveLength(0);
  });

  it('CT-035c deixa o encarregado abrir a segunda passagem de quem voltou', async () => {
    // Quem vê a pessoa voltar ao canteiro é ele. Decisão de 17/09/2026.
    const criada = await cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;
    const c1 = await daAcessoDeEncarregado(
      await cenario.novoAtor('c2@exemplo.invalido'),
      '77777777-7777-4777-8777-777777777777',
    );

    const segunda = await registraPassagemProtegida(
      c1,
      obraId,
      { pessoaId: criada.valor, funcao: 'Motorista', entrada: '2026-03-15' },
      cenario.amb,
    );

    expect(segunda.ok).toBe(true);
    const lista = await listaPessoalDaObra(obraId, paraPessoal(cenario.amb));
    expect(lista.ok && lista.valor[0]?.passagens).toHaveLength(2);
  });

  it('CT-036 recusa pessoa sem função', async () => {
    const resultado = await cadastraPessoaProtegida(
      e1,
      obraId,
      { nome: 'P6', funcao: '', entrada: '2026-02-10' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
  });

  it('CT-037 recusa função fora da taxonomia e não cria termo por efeito colateral', async () => {
    const antes = await listaTermos('funcao', paraTaxonomia(cenario.amb));
    const resultado = await cadastra('P7', 'Encanador', '2026-02-10');
    const depois = await listaTermos('funcao', paraTaxonomia(cenario.amb));

    expect(resultado.ok).toBe(false);
    expect(depois.ok && depois.valor.some((t) => t.termo === 'Encanador')).toBe(false);
    expect(depois.ok && depois.valor.length).toBe(antes.ok ? antes.valor.length : -1);
  });

  it('CT-038 recusa entrada em 31/09/2026, que não existe no calendário', async () => {
    const resultado = await cadastra('P8', 'Motorista', '2026-09-31');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
  });

  it('CT-039 recusa passagem sem data de entrada', async () => {
    const resultado = await cadastraPessoaProtegida(
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
  it('entrega as passagens da pessoa sem nenhum campo de nome', async () => {
    // R2 e LGPD: o documento que circula não precisa dizer quem trabalhou. O
    // vazamento é impossível pelo TIPO, não por disciplina de tela.
    //
    // **A contagem do efetivo não está aqui, e é de propósito.** Ela vive em
    // `src/modules/rdo/efetivo.ts`, num lugar só, e as fronteiras da regra R1
    // estão em `test/efetivo-do-rdo.test.ts`, contra o cadastro de verdade.
    expect((await cadastra('P1', 'Motorista', '2026-02-10', '2026-02-20')).ok).toBe(true);

    const mobilizacao = await listaMobilizacaoDePessoalProtegida(e1, obraId, cenario.amb);
    expect(mobilizacao.ok).toBe(true);
    if (!mobilizacao.ok) return;

    expect(Object.keys(mobilizacao.valor[0] ?? {})).toEqual(['pessoaId', 'passagens']);
    // A função vem por passagem (decisão 29.1), nunca uma só na pessoa.
    expect(mobilizacao.valor[0]?.passagens).toEqual([
      { funcaoId: expect.any(String), entrada: '2026-02-10', saida: '2026-02-20' },
    ]);
    expect(JSON.stringify(mobilizacao.valor)).not.toContain('P1');
  });

  it('junta as duas passagens de quem sai e volta na mesma pessoa', async () => {
    // Caso obrigatório 8: duas linhas de cadastro, uma pessoa só.
    const criada = await cadastra('P1', 'Motorista', '2026-02-10', '2026-02-28');
    expect(criada.ok).toBe(true);
    if (!criada.ok) return;
    await registraPassagemProtegida(
      e1,
      obraId,
      { pessoaId: criada.valor, funcao: 'Motorista', entrada: '2026-03-15' },
      cenario.amb,
    );

    const mobilizacao = await listaMobilizacaoDePessoalProtegida(e1, obraId, cenario.amb);
    expect(mobilizacao.ok && mobilizacao.valor).toHaveLength(1);
    expect(mobilizacao.ok && mobilizacao.valor[0]?.passagens).toHaveLength(2);
  });
});
