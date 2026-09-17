/**
 * A borda do RDO de período: onde o conjunto vindo do navegador deixa de ser
 * hostil.
 *
 * Origem das expectativas, `docs/arquitetura/periodo.md`, 1.2 e 1.3:
 *
 * - comprimento **antes** de olhar item nenhum: um array de cem mil itens não
 *   pode custar cem mil validações de calendário antes de ser recusado;
 * - cada item passa por `criaDiaPuro`, então `2026-09-31` é recusado pelo
 *   calendário real (caso obrigatório 10);
 * - o conjunto é **ordenado e deduplicado**: dia repetido dobraria `EXEC.` e o
 *   total de mm;
 * - dia repetido é removido **sem erro** (decisão 3 do contrato): tocar duas
 *   vezes no mesmo RDO na tela não é mentira do usuário;
 * - o teto é o mesmo `DIAS_MAXIMOS_DA_CONSULTA = 366` da consulta do diário
 *   (decisão 35.1), aqui contando **cardinalidade**.
 */

import { describe, expect, it } from 'vitest';

import { somaDias } from '../../../shared/date/dia';
import { CODIGO_ERRO } from '../../../shared/result';
import { DIAS_MAXIMOS_DA_CONSULTA } from './esquemas';
import { interpretaPedidoDeRdoDePeriodo } from './esquemas-de-periodo';

function pedido(dias: unknown): unknown {
  return { obraId: 'B02', dias };
}

describe('interpretaPedidoDeRdoDePeriodo', () => {
  it('ordena o conjunto que veio fora de ordem', () => {
    const r = interpretaPedidoDeRdoDePeriodo(
      pedido(['2026-09-09', '2026-09-02', '2026-09-05']),
    );

    expect(r.ok && r.valor.dias).toEqual(['2026-09-02', '2026-09-05', '2026-09-09']);
  });

  it('remove o dia repetido sem recusar o pedido', () => {
    const r = interpretaPedidoDeRdoDePeriodo(
      pedido(['2026-09-02', '2026-09-02', '2026-09-05']),
    );

    expect(r.ok && r.valor.dias).toEqual(['2026-09-02', '2026-09-05']);
  });

  it('recusa a data que o calendário não tem', () => {
    const r = interpretaPedidoDeRdoDePeriodo(pedido(['2026-09-31']));

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
  });

  it('recusa o conjunto vazio', () => {
    const r = interpretaPedidoDeRdoDePeriodo(pedido([]));

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.CAMPO_OBRIGATORIO);
  });

  it('recusa o conjunto maior que o teto da consulta', () => {
    const demais = Array.from(
      { length: DIAS_MAXIMOS_DA_CONSULTA + 1 },
      () => '2026-09-01',
    );

    const r = interpretaPedidoDeRdoDePeriodo(pedido(demais));

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.PERIODO_LONGO_DEMAIS);
  });

  it('recusa o item que não é texto', () => {
    const r = interpretaPedidoDeRdoDePeriodo(pedido([20260901]));

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DIA_INVALIDO);
  });

  it('recusa o pedido sem obra', () => {
    const r = interpretaPedidoDeRdoDePeriodo({ dias: ['2026-09-01'] });

    expect(r.ok).toBe(false);
  });

  it('aceita o conjunto no tamanho exato do teto', () => {
    // 366 dias distintos e reais, que é a duração do contrato.
    const noLimite = Array.from({ length: DIAS_MAXIMOS_DA_CONSULTA }, (_, i) =>
      somaDias('2026-02-05', i),
    );

    const r = interpretaPedidoDeRdoDePeriodo(pedido(noLimite));

    expect(r.ok).toBe(true);
    expect(r.ok && r.valor.dias).toHaveLength(DIAS_MAXIMOS_DA_CONSULTA);
  });
});
