/**
 * O mês vem da URL, e URL é entrada hostil.
 *
 * `/pluviometria/<obra>/<mes>` aceita qualquer coisa no lugar do mês, e o que
 * chega vira `diasDoMes(ano, mes)`. Sem borda, `2026-99` pediria um mês que não
 * existe e `999999-01` montaria um conjunto absurdo de dias antes de qualquer
 * recusa — a mesma forma do defeito que o teto de 366 dias corrigiu na
 * exportação de período.
 *
 * As expectativas vêm da regra: formato `AAAA-MM`, mês de 1 a 12, e ano dentro
 * da faixa que um contrato de obra alcança.
 */

import { describe, expect, it } from 'vitest';

import { leMesDoControle } from '../src/app/_composicao/controle-pluviometrico';

function recusa(bruto: string): boolean {
  return !leMesDoControle(bruto).ok;
}

describe('a borda do mês do controle pluviométrico', () => {
  it('aceita o formato do calendário', () => {
    const r = leMesDoControle('2026-09');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor).toEqual({ ano: 2026, mes: 9 });
  });

  it('aceita janeiro e dezembro, as duas pontas', () => {
    expect(leMesDoControle('2026-01').ok).toBe(true);
    expect(leMesDoControle('2026-12').ok).toBe(true);
  });

  it('recusa mês fora de 1 a 12', () => {
    expect(recusa('2026-00')).toBe(true);
    expect(recusa('2026-13')).toBe(true);
    expect(recusa('2026-99')).toBe(true);
  });

  it('recusa ano fora da faixa de um contrato de obra', () => {
    expect(recusa('1999-01')).toBe(true);
    expect(recusa('2101-01')).toBe(true);
  });

  it('recusa o que não é AAAA-MM', () => {
    // Dia junto, mês com um dígito, vazio, texto e a tentativa de injeção.
    expect(recusa('2026-09-01')).toBe(true);
    expect(recusa('2026-9')).toBe(true);
    expect(recusa('')).toBe(true);
    expect(recusa('setembro')).toBe(true);
    expect(recusa("2026-09' OR '1'='1")).toBe(true);
  });

  it('a mensagem diz o que corrigir, sem vazar detalhe técnico', () => {
    const r = leMesDoControle('setembro');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro.mensagem).toMatch(/AAAA-MM/);
      // Nem rastro de pilha, nem nome de coluna, nem SQL.
      expect(r.erro.mensagem).not.toMatch(/at |SELECT|obra_id/);
    }
  });
});
