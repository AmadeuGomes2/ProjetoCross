/**
 * CT-041 a CT-049 — Equipamento e passagem
 * (`docs/qa/v1-casos-passos-1-3.md`, F2.2).
 *
 * Origem das expectativas: PRD, Funcionalidade 2.2; decisões 1.2 e 19.1; R2,
 * R3 e R14; `inconsistencias.md` E6 (`EQUIPAMENTO!B7` = `CARRO LOC.`) e a nota
 * solta de `EQUIPAMENTO!M2`; casos obrigatórios 2 e 8.
 *
 * CT-049 tem duas metades. A daqui é a que esta frente responde: o porta de
 * efetivo **não devolve o tipo**, então o bloco 6 não tem como imprimi-lo. A
 * outra metade, o PDF, é da frente C.
 *
 * O banco é Postgres desde 17/09/2026: o cenário e os casos de uso são
 * assíncronos, e `conexao.sqlite` não existe mais — a liberação de acesso
 * passa pelo Drizzle.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraEquipamento } from '../../app/_composicao/ambiente-de-cadastro';
import {
  cadastraEquipamentoProtegido,
  listaMobilizacaoDeEquipamentoProtegida,
  listaEquipamentosProtegida,
  registraPassagemDeEquipamentoProtegida,
} from '../../app/_composicao/cadastro';
import { acesso } from '../../db/schema';
import { CODIGO_ERRO } from '../../shared/result';
import {
  criaObraDoPrd,
  DADOS_DA_OBRA,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import { criaObraProtegida } from '../../app/_composicao/cadastro';
import type { Ator } from '../../modules/acesso';
import { idConfiavel, type ObraId } from '../../shared/id';
import { listaEquipamentosDaObra } from './casos-de-uso';

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
  identificador: string,
  tipo: string,
  entrada: string,
  saida?: string,
  obra: ObraId = obraId,
  ator: Ator = e1,
) {
  return await cadastraEquipamentoProtegido(
    ator,
    obra,
    saida === undefined
      ? { identificador, tipo, entrada }
      : { identificador, tipo, entrada, saida },
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

describe('F2.2 — cadastro de equipamento e passagens', () => {
  it('CT-041 cadastra o equipamento por identificador, com passagem em aberto', async () => {
    expect((await cadastra('CF-29', 'PATROL', '2026-02-05')).ok).toBe(true);

    const lista = await listaEquipamentosProtegida(e1, obraId, cenario.amb);
    expect(lista.ok).toBe(true);
    if (!lista.ok) return;

    const cf29 = lista.valor.find((e) => e.identificador === 'CF-29');
    expect(cf29?.passagens).toEqual([
      { id: expect.any(String), entrada: '2026-02-05', saida: null },
    ]);
  });

  it('CT-042 recusa identificador repetido na mesma obra e diz o motivo', async () => {
    expect((await cadastra('CF-29', 'PATROL', '2026-02-05')).ok).toBe(true);
    const resultado = await cadastra('CF-29', 'RETRO', '2026-03-01');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.mensagem).toBe(
      'Este identificador já existe nesta obra. Use outro.',
    );
  });

  it('CT-043 aceita o mesmo identificador em outra obra: a frota circula', async () => {
    expect((await cadastra('CF-29', 'PATROL', '2026-02-05')).ok).toBe(true);

    // A segunda obra é criada por quem já é engenheiro da primeira (25.1).
    const outra = await criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );
    expect(outra.ok).toBe(true);
    if (!outra.ok) return;

    expect(
      (await cadastra('CF-29', 'PATROL', '2026-02-05', undefined, outra.valor, e1)).ok,
    ).toBe(true);
  });

  it('CT-044 equipamento que sai e volta tem duas passagens e um só cadastro', async () => {
    const criado = await cadastra('MT-26', 'BASCULA', '2026-02-05', '2026-02-18');
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;

    const segunda = await registraPassagemDeEquipamentoProtegida(
      e1,
      obraId,
      { equipamentoId: criado.valor, entrada: '2026-03-01' },
      cenario.amb,
    );
    expect(segunda.ok).toBe(true);

    const lista = await listaEquipamentosDaObra(obraId, paraEquipamento(cenario.amb));
    expect(lista.ok && lista.valor).toHaveLength(1);
    expect(lista.ok && lista.valor[0]?.passagens).toHaveLength(2);
  });

  it('CT-045 recusa saída anterior à entrada', async () => {
    const resultado = await cadastra('RE-17', 'RETRO', '2026-02-05', '2026-02-04');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL);
  });

  it('recusa a passagem sobreposta com o código de sobreposição, e não com o de ordem invertida', async () => {
    // Mesma origem do teste irmão em `pessoal`: `src/shared/result`,
    // CODIGO_ERRO.INTERVALO_SOBREPOSTO. Um intervalo invertido e dois
    // intervalos que brigam são defeitos diferentes e não compartilham código.
    const criado = await cadastra('MT-27', 'BASCULA', '2026-02-05', '2026-02-18');
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;

    const segunda = await registraPassagemDeEquipamentoProtegida(
      e1,
      obraId,
      { equipamentoId: criado.valor, entrada: '2026-02-10' },
      cenario.amb,
    );

    expect(segunda.ok).toBe(false);
    if (segunda.ok) return;
    expect(segunda.erro.codigo).toBe(CODIGO_ERRO.INTERVALO_SOBREPOSTO);
    expect(segunda.erro.mensagem).toBe(
      'Já existe uma passagem deste equipamento cobrindo esse intervalo. Encerre a anterior antes.',
    );
  });

  it('CT-046 aceita saída no mesmo dia da entrada', async () => {
    expect((await cadastra('RE-18', 'RETRO', '2026-02-05', '2026-02-05')).ok).toBe(true);

    const lista = await listaEquipamentosDaObra(obraId, paraEquipamento(cenario.amb));
    expect(lista.ok && lista.valor[0]?.passagens[0]).toEqual({
      id: expect.any(String),
      entrada: '2026-02-05',
      saida: '2026-02-05',
    });
  });

  /*
   * CT-047 mudou em 17/09/2026, por decisão do dono do produto: o encarregado
   * passa a **cadastrar** equipamento. Ele é quem vê a máquina chegar ao
   * canteiro, e travar isso obrigava o RDO a sair sem o equipamento até o
   * engenheiro cadastrar.
   *
   * Encerrar passagem continua sendo do engenheiro: desmobilizar muda o
   * efetivo de todo dia seguinte, e não é ato de campo.
   */
  it('CT-047 deixa o encarregado cadastrar equipamento na obra dele', async () => {
    const c1 = await daAcessoDeEncarregado(
      await cenario.novoAtor('c1@exemplo.invalido'),
      '77777777-7777-4777-8777-777777777777',
    );

    const resultado = await cadastra(
      'TP-41',
      'TRATOR',
      '2026-02-05',
      undefined,
      obraId,
      c1,
    );

    expect(resultado.ok).toBe(true);
    const lista = await listaEquipamentosDaObra(obraId, paraEquipamento(cenario.amb));
    expect(lista.ok && lista.valor).toHaveLength(1);
  });

  it('CT-047b recusa o cadastro de equipamento a quem não tem acesso à obra', async () => {
    const estranho = await cenario.novoAtor('estranho@exemplo.invalido');

    const resultado = await cadastra(
      'TP-99',
      'TRATOR',
      '2026-02-05',
      undefined,
      obraId,
      estranho,
    );

    expect(resultado.ok).toBe(false);
    const lista = await listaEquipamentosDaObra(obraId, paraEquipamento(cenario.amb));
    expect(lista.ok && lista.valor).toHaveLength(0);
  });

  it('CT-048 aceita o identificador real "CARRO LOC.", sem placa', async () => {
    expect((await cadastra('CARRO LOC.', 'CARRO', '2026-02-05')).ok).toBe(true);

    const lista = await listaEquipamentosDaObra(obraId, paraEquipamento(cenario.amb));
    expect(lista.ok && lista.valor[0]?.identificador).toBe('CARRO LOC.');
  });

  it('CT-049 a mobilização devolve o identificador e nunca o tipo', async () => {
    // O bloco 6 imprime `CF-29`, nunca `PATROL`: o tipo é cadastro interno e
    // imprimi-lo é divergência de layout. O tipo não sai do módulo.
    //
    // A CONTAGEM não está aqui: `equipamento` entrega passagens cruas e quem
    // conta é `src/modules/rdo/efetivo.ts`. As fronteiras da regra 1.2 contra o
    // cadastro de verdade estão em `test/efetivo-do-rdo.test.ts`.
    expect((await cadastra('CF-29', 'PATROL', '2026-02-05')).ok).toBe(true);

    const mobilizacao = await listaMobilizacaoDeEquipamentoProtegida(
      e1,
      obraId,
      cenario.amb,
    );
    expect(mobilizacao.ok).toBe(true);
    if (!mobilizacao.ok) return;

    const linha = mobilizacao.valor[0];
    expect(linha?.identificador).toBe('CF-29');
    expect(Object.keys(linha ?? {})).toEqual([
      'equipamentoId',
      'identificador',
      'ordem',
      'passagens',
    ]);
    expect(linha?.passagens).toEqual([{ entrada: '2026-02-05', saida: null }]);
    expect(JSON.stringify(mobilizacao.valor)).not.toContain('PATROL');
  });

  it('recusa tipo de equipamento fora da taxonomia', async () => {
    const resultado = await cadastra('XX-01', 'GUINDASTE', '2026-02-05');
    expect(resultado.ok).toBe(false);
  });
});
