/**
 * O teto de dias vale **na rota**, e não só no módulo.
 *
 * A primeira versão de `leiaPedidoDeExportacao` tinha validação própria, e nela
 * faltava o teto de 366 dias. O efeito: um `POST` com 20.000 datas válidas era
 * aceito, e a leitura do instantâneo acontecia com o conjunto inteiro antes de
 * qualquer recusa. Sessão de engenheiro bastava para consumir o servidor.
 *
 * Duas bordas para a mesma entrada é sempre isso — uma delas fica para trás. A
 * rota passou a usar `interpretaPedidoDeRdoDePeriodo`, a borda do módulo, e
 * este arquivo existe para que ela não volte a ter a sua.
 *
 * A expectativa vem da regra, não da implementação: o teto é a duração do
 * contrato (366 dias), porque é a maior consulta que faz sentido pedir.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  criaAmbienteDaComposicao,
  defineAmbienteParaTeste,
  restauraAmbientePadrao,
} from '../src/app/_composicao/ambiente';
import { respondeComOPeriodoExportado } from '../src/app/_composicao/exportacao-de-periodo';
import { somaDias } from '../src/shared/date/dia';
import type { ObraId } from '../src/shared/id';
import type { Ator } from '../src/modules/acesso';
import { relogioFixo } from './fixtures/banco-de-teste';
import {
  AGORA,
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from './fixtures/cenario-de-cadastro';

let cenario: Cenario;
let obraId: ObraId;
let engenheira: Ator;

beforeEach(async () => {
  cenario = await montaCenario();
  defineAmbienteParaTeste(criaAmbienteDaComposicao(cenario.conexao, relogioFixo(AGORA)));
  engenheira = await cenario.novoEngenheiro('eng@exemplo.invalido');
  obraId = await criaObraDoPrd(engenheira, cenario.amb);
});

afterEach(async () => {
  restauraAmbientePadrao();
  await cenario.fecha();
});

function pede(dias: readonly string[]) {
  return respondeComOPeriodoExportado(
    { usuarioId: engenheira.usuarioId },
    'engenheiro',
    obraId,
    { dias, modo: 'consolidado', formato: 'PDF' },
  );
}

/** Datas válidas e distintas, a partir de um dia dentro do contrato. */
function muitosDias(quantos: number): string[] {
  return Array.from({ length: quantos }, (_, passo) => somaDias('2026-02-05', passo));
}

describe('o teto de dias na rota de exportação', () => {
  it('recusa um pedido acima do teto, sem ler o banco', async () => {
    const resposta = await pede(muitosDias(20_000));

    expect(resposta.status).toBe(400);
    const corpo = (await resposta.json()) as { erro: string };
    // A mensagem diz o que corrigir, e traz o número para quem lê o log
    // reconhecer a tentativa de longe.
    expect(corpo.erro).toMatch(/366/);
  });

  it('recusa conjunto vazio', async () => {
    const resposta = await pede([]);
    expect(resposta.status).toBe(400);
  });

  it('recusa data que não existe no calendário', async () => {
    const resposta = await pede(['2026-09-31']);
    expect(resposta.status).toBe(400);
  });

  it('recusa dia fora do período do contrato', async () => {
    // O contrato do cenário vai de 05/02/2026 a 05/02/2027.
    const resposta = await pede(['2025-12-31']);
    expect(resposta.status).toBeGreaterThanOrEqual(400);
  });

  it('aceita um conjunto dentro do teto', async () => {
    const resposta = await pede(['2026-09-02', '2026-09-03']);

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('content-type')).toBe('application/pdf');
  });

  it('normaliza o conjunto no servidor: repetido e fora de ordem passam', async () => {
    const resposta = await pede(['2026-09-03', '2026-09-02', '2026-09-03']);

    // Repetir um dia não é erro de quem pede; o que não se admite é calcular
    // sobre um conjunto diferente do que a pessoa escolheu.
    expect(resposta.status).toBe(200);
  });

  it('recusa o encarregado, mesmo com o pedido bem formado', async () => {
    const resposta = await respondeComOPeriodoExportado(
      { usuarioId: engenheira.usuarioId },
      'encarregado',
      obraId,
      { dias: ['2026-09-02'], modo: 'consolidado', formato: 'PDF' },
    );

    expect(resposta.status).toBe(403);
  });
});
