import { describe, expect, it } from 'vitest';

import { intervaloCobreODia } from './intervalo';

/**
 * A regra que decide o efetivo do RDO.
 *
 * Origem da expectativa: decisão 1.1 de 16/09/2026, em
 * docs/prd/v1.md (DECISÕES TOMADAS) e .claude/skills/regras-rdo/SKILL.md:
 *
 *   conta no dia D quando `entrada <= D` e (`saída` nula ou `saída >= D`)
 *
 * A data de saída é o ÚLTIMO DIA TRABALHADO, então a pessoa conta nele.
 * Decisão 1.2: equipamento segue exatamente a mesma regra.
 *
 * Isto é o caso de teste obrigatório 1. A planilha legada respondia das duas
 * formas ao mesmo tempo, com `<=` em 18 colunas e `<` em 23, e por isso o
 * valor de fronteira tem teste próprio, com nome próprio.
 */

const ENTRADA = '2026-02-10';
const SAIDA = '2026-02-20';

describe('intervaloCobreODia, passagem ainda aberta', () => {
  it('não conta no dia anterior à entrada', () => {
    expect(intervaloCobreODia(ENTRADA, null, '2026-02-09')).toBe(false);
  });

  // Fronteira, caso próprio.
  it('conta no próprio dia da entrada', () => {
    expect(intervaloCobreODia(ENTRADA, null, '2026-02-10')).toBe(true);
  });

  it('conta em qualquer dia depois da entrada', () => {
    expect(intervaloCobreODia(ENTRADA, null, '2026-09-30')).toBe(true);
  });
});

describe('intervaloCobreODia, passagem encerrada', () => {
  it('não conta antes da entrada', () => {
    expect(intervaloCobreODia(ENTRADA, SAIDA, '2026-02-09')).toBe(false);
  });

  it('conta no dia da entrada', () => {
    expect(intervaloCobreODia(ENTRADA, SAIDA, '2026-02-10')).toBe(true);
  });

  it('conta no meio do intervalo', () => {
    expect(intervaloCobreODia(ENTRADA, SAIDA, '2026-02-15')).toBe(true);
  });

  it('conta na véspera da saída', () => {
    expect(intervaloCobreODia(ENTRADA, SAIDA, '2026-02-19')).toBe(true);
  });

  /**
   * ESTE é o caso de teste obrigatório 1, e o motivo de a regra existir.
   * Decisão 1.1: a data de saída é o último dia trabalhado, logo CONTA.
   */
  it('CONTA no próprio dia da saída', () => {
    expect(intervaloCobreODia(ENTRADA, SAIDA, '2026-02-20')).toBe(true);
  });

  it('não conta no dia seguinte à saída', () => {
    expect(intervaloCobreODia(ENTRADA, SAIDA, '2026-02-21')).toBe(false);
  });

  it('não conta muito depois da saída', () => {
    expect(intervaloCobreODia(ENTRADA, SAIDA, '2026-09-30')).toBe(false);
  });
});

describe('intervaloCobreODia, passagem de um dia só', () => {
  it('conta no único dia quando entrada e saída são iguais', () => {
    expect(intervaloCobreODia('2026-03-01', '2026-03-01', '2026-03-01')).toBe(true);
  });

  it('não conta na véspera nem no dia seguinte', () => {
    expect(intervaloCobreODia('2026-03-01', '2026-03-01', '2026-02-28')).toBe(false);
    expect(intervaloCobreODia('2026-03-01', '2026-03-01', '2026-03-02')).toBe(false);
  });
});

describe('intervaloCobreODia, passagem inconsistente', () => {
  /**
   * Caso de teste obrigatório 2: saída anterior à entrada.
   * O cadastro rejeita isso antes de gravar, mas se um dado assim existir
   * a função não pode dizer que alguém trabalhou: não cobre dia nenhum.
   */
  it('não cobre dia nenhum quando a saída é anterior à entrada', () => {
    expect(intervaloCobreODia('2026-02-20', '2026-02-10', '2026-02-10')).toBe(false);
    expect(intervaloCobreODia('2026-02-20', '2026-02-10', '2026-02-15')).toBe(false);
    expect(intervaloCobreODia('2026-02-20', '2026-02-10', '2026-02-20')).toBe(false);
  });
});

describe('intervaloCobreODia, pessoa que sai e volta', () => {
  /**
   * Caso de teste obrigatório 8, aplicado a duas passagens da mesma pessoa.
   * Cada passagem é avaliada em separado; quem soma é o módulo de efetivo,
   * que conta a PESSOA uma vez quando qualquer passagem dela cobre o dia.
   */
  const primeira = { entrada: '2026-02-10', saida: '2026-02-20' };
  const segunda = { entrada: '2026-03-05', saida: null };

  it('cobre o dia na primeira passagem e não na segunda', () => {
    expect(intervaloCobreODia(primeira.entrada, primeira.saida, '2026-02-15')).toBe(true);
    expect(intervaloCobreODia(segunda.entrada, segunda.saida, '2026-02-15')).toBe(false);
  });

  it('não cobre o dia no intervalo entre as duas passagens', () => {
    expect(intervaloCobreODia(primeira.entrada, primeira.saida, '2026-03-01')).toBe(
      false,
    );
    expect(intervaloCobreODia(segunda.entrada, segunda.saida, '2026-03-01')).toBe(false);
  });

  it('cobre o dia na segunda passagem', () => {
    expect(intervaloCobreODia(primeira.entrada, primeira.saida, '2026-03-10')).toBe(
      false,
    );
    expect(intervaloCobreODia(segunda.entrada, segunda.saida, '2026-03-10')).toBe(true);
  });
});
