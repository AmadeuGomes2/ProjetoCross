import { describe, expect, it } from 'vitest';

import {
  conflitaComAlgum,
  intervalosSeSobrepoem,
  intervaloCobreODia,
  ordemDasDatasEstaInvertida,
} from './intervalo';

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

describe('ordemDasDatasEstaInvertida', () => {
  /**
   * Caso de teste obrigatório 9. Origem: o período de BMS 4 da planilha real
   * tem início em 01/12/2024 e fim em 15/12/2022, ou seja, -716 dias.
   */
  it('acusa fim anterior ao início', () => {
    expect(ordemDasDatasEstaInvertida({ inicio: '2024-12-01', fim: '2022-12-15' })).toBe(
      true,
    );
  });

  it('aceita fim igual ao início, que é período de um dia', () => {
    expect(ordemDasDatasEstaInvertida({ inicio: '2026-03-01', fim: '2026-03-01' })).toBe(
      false,
    );
  });

  it('aceita ordem correta e fim em aberto', () => {
    expect(ordemDasDatasEstaInvertida({ inicio: '2026-02-10', fim: '2026-02-20' })).toBe(
      false,
    );
    expect(ordemDasDatasEstaInvertida({ inicio: '2026-02-10', fim: null })).toBe(false);
  });
});

describe('intervalosSeSobrepoem', () => {
  const fevereiro = { inicio: '2026-02-01', fim: '2026-02-28' };

  it('não se sobrepõem quando um termina antes do outro começar', () => {
    expect(
      intervalosSeSobrepoem(fevereiro, { inicio: '2026-03-01', fim: '2026-03-31' }),
    ).toBe(false);
    expect(
      intervalosSeSobrepoem({ inicio: '2026-01-01', fim: '2026-01-31' }, fevereiro),
    ).toBe(false);
  });

  // Fronteira: um dia de distância não é sobreposição.
  it('não se sobrepõem quando são dias consecutivos', () => {
    expect(intervalosSeSobrepoem(fevereiro, { inicio: '2026-03-01', fim: null })).toBe(
      false,
    );
  });

  // Fronteira: compartilhar um único dia JÁ é sobreposição.
  it('se sobrepõem quando compartilham só o último dia', () => {
    expect(
      intervalosSeSobrepoem(fevereiro, { inicio: '2026-02-28', fim: '2026-03-15' }),
    ).toBe(true);
  });

  it('se sobrepõem quando compartilham só o primeiro dia', () => {
    expect(
      intervalosSeSobrepoem(fevereiro, { inicio: '2026-01-10', fim: '2026-02-01' }),
    ).toBe(true);
  });

  it('se sobrepõem quando um contém o outro', () => {
    expect(
      intervalosSeSobrepoem(fevereiro, { inicio: '2026-02-10', fim: '2026-02-12' }),
    ).toBe(true);
  });

  it('intervalo aberto se sobrepõe a tudo que vem depois do seu início', () => {
    expect(intervalosSeSobrepoem({ inicio: '2026-01-01', fim: null }, fevereiro)).toBe(
      true,
    );
  });

  it('dois intervalos abertos sempre se sobrepõem', () => {
    expect(
      intervalosSeSobrepoem(
        { inicio: '2020-01-01', fim: null },
        { inicio: '2030-01-01', fim: null },
      ),
    ).toBe(true);
  });
});

describe('conflitaComAlgum', () => {
  const existentes = [
    { inicio: '2026-02-01', fim: '2026-02-28' },
    { inicio: '2026-04-01', fim: '2026-04-30' },
  ];

  it('não conflita quando cabe na folga entre os dois', () => {
    expect(
      conflitaComAlgum({ inicio: '2026-03-01', fim: '2026-03-31' }, existentes),
    ).toBe(false);
  });

  it('conflita quando encosta no segundo', () => {
    expect(
      conflitaComAlgum({ inicio: '2026-03-01', fim: '2026-04-01' }, existentes),
    ).toBe(true);
  });

  it('não conflita quando não há nenhum existente', () => {
    expect(conflitaComAlgum({ inicio: '2026-03-01', fim: null }, [])).toBe(false);
  });
});
