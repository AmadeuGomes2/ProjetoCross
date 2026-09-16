import { describe, expect, it } from 'vitest';

import {
  criaDiaPuro,
  diaDaSemana,
  diferencaEmDias,
  formataBr,
  somaDias,
  ultimoDiaDoMes,
} from './dia';

/**
 * Testes escritos ANTES da implementação, a partir da regra de negócio.
 *
 * Origem das expectativas:
 * - dia puro sem hora e fuso num lugar só: CLAUDE.md, Modelo; regra R9 do PRD
 * - exibição dd/mm/aaaa: docs/dominio/inconsistencias.md, D1; caso de teste 15
 * - dia da semana capitalizado com hífen: skill fidelidade-documento, bloco 2
 * - mês de 30 e de 28 dias: caso de teste obrigatório 10
 *
 * Nenhuma expectativa foi lida da implementação.
 */

describe('criaDiaPuro', () => {
  it('aceita uma data real do calendário', () => {
    const r = criaDiaPuro('2026-09-03');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor).toBe('2026-09-03');
  });

  it('aceita o primeiro e o último dia do mês', () => {
    expect(criaDiaPuro('2026-09-01').ok).toBe(true);
    expect(criaDiaPuro('2026-09-30').ok).toBe(true);
  });

  // Caso de teste obrigatório 10: mês de 30 dias.
  // A planilha gerava 31 de setembro encadeando dia+1; aqui isso é rejeitado.
  it('rejeita 31 de setembro, que não existe', () => {
    const r = criaDiaPuro('2026-09-31');
    expect(r.ok).toBe(false);
  });

  // Caso de teste obrigatório 10: mês de 28 dias.
  it('rejeita 29 de fevereiro em ano não bissexto', () => {
    expect(criaDiaPuro('2026-02-29').ok).toBe(false);
  });

  it('aceita 29 de fevereiro em ano bissexto', () => {
    expect(criaDiaPuro('2024-02-29').ok).toBe(true);
  });

  it('rejeita mês e dia fora de faixa', () => {
    expect(criaDiaPuro('2026-13-01').ok).toBe(false);
    expect(criaDiaPuro('2026-00-10').ok).toBe(false);
    expect(criaDiaPuro('2026-09-00').ok).toBe(false);
    expect(criaDiaPuro('2026-09-32').ok).toBe(false);
  });

  // Caso de teste obrigatório 14 e 15: formato único, nunca o americano.
  it('rejeita formato que não seja AAAA-MM-DD', () => {
    expect(criaDiaPuro('03/09/2026').ok).toBe(false);
    expect(criaDiaPuro('09-03-2026').ok).toBe(false);
    expect(criaDiaPuro('2026-9-3').ok).toBe(false);
    expect(criaDiaPuro('2026-09-03T00:00:00Z').ok).toBe(false);
    expect(criaDiaPuro('').ok).toBe(false);
    expect(criaDiaPuro('   ').ok).toBe(false);
  });
});

describe('formataBr', () => {
  // docs/dominio/inconsistencias.md D1: metade da planilha usa formato americano.
  it('exibe sempre no formato brasileiro', () => {
    expect(formataBr('2026-09-03')).toBe('03/09/2026');
    expect(formataBr('2026-12-25')).toBe('25/12/2026');
  });

  it('não troca dia por mês em data ambígua', () => {
    expect(formataBr('2026-03-09')).toBe('09/03/2026');
  });
});

describe('diaDaSemana', () => {
  // skill fidelidade-documento, bloco 2: capitalizado, com hífen.
  it('nomeia o dia como o documento exige', () => {
    expect(diaDaSemana('2026-09-01')).toBe('Terça-Feira');
    expect(diaDaSemana('2026-09-02')).toBe('Quarta-Feira');
    expect(diaDaSemana('2026-09-03')).toBe('Quinta-Feira');
    expect(diaDaSemana('2026-09-04')).toBe('Sexta-Feira');
    expect(diaDaSemana('2026-09-05')).toBe('Sábado');
    expect(diaDaSemana('2026-09-06')).toBe('Domingo');
    expect(diaDaSemana('2026-09-07')).toBe('Segunda-Feira');
  });
});

describe('diferencaEmDias', () => {
  /**
   * Base do número do RDO (decisão 6.1: o primeiro dia do contrato é o RDO 0).
   * Valores conferidos contra a planilha real: obra iniciada em 05/02/2026,
   * o RDO de 01/09/2026 é o número 208 e o de 30/09/2026 é o 237.
   */
  it('dá zero no próprio dia de início', () => {
    expect(diferencaEmDias('2026-02-05', '2026-02-05')).toBe(0);
  });

  it('reproduz os números de RDO da planilha de referência', () => {
    expect(diferencaEmDias('2026-02-05', '2026-09-01')).toBe(208);
    expect(diferencaEmDias('2026-02-05', '2026-09-30')).toBe(237);
  });

  it('conta dia corrido, incluindo sábado e domingo', () => {
    expect(diferencaEmDias('2026-09-04', '2026-09-07')).toBe(3);
  });

  it('atravessa a virada de ano', () => {
    expect(diferencaEmDias('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('é negativo quando o dia é anterior ao início', () => {
    expect(diferencaEmDias('2026-02-05', '2026-02-04')).toBe(-1);
  });

  // Fuso: a diferença é de calendário, não de instante. Se fosse calculada
  // com horário, o horário de verão faria um par de dias dar 0 ou 2.
  it('não é afetada por mudança de horário de verão', () => {
    expect(diferencaEmDias('2026-10-17', '2026-10-18')).toBe(1);
    expect(diferencaEmDias('2026-02-14', '2026-02-15')).toBe(1);
  });
});

describe('somaDias', () => {
  it('avança dentro do mês', () => {
    expect(somaDias('2026-09-01', 1)).toBe('2026-09-02');
  });

  it('atravessa o fim de mês de 30 dias', () => {
    expect(somaDias('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('atravessa o fim de fevereiro em ano não bissexto', () => {
    expect(somaDias('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('anda para trás com número negativo', () => {
    expect(somaDias('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('ultimoDiaDoMes', () => {
  it('conhece meses de 30, 31, 28 e 29 dias', () => {
    expect(ultimoDiaDoMes(2026, 9)).toBe('2026-09-30');
    expect(ultimoDiaDoMes(2026, 10)).toBe('2026-10-31');
    expect(ultimoDiaDoMes(2026, 2)).toBe('2026-02-28');
    expect(ultimoDiaDoMes(2024, 2)).toBe('2024-02-29');
  });
});
