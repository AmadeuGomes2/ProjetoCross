import { describe, expect, it } from 'vitest';

import {
  deMilesimos,
  deTextoDoUsuario,
  divideParaPercentual,
  formataBr,
  formataBrOuTraco,
  paraMilesimos,
  soma,
  zero,
} from './index';

/**
 * Quantidade de produção.
 *
 * Origem das expectativas:
 * - risco 4 do PRD: ponto flutuante binário não soma acumulado
 * - regra R5 e skill regras-rdo, seção 2: acumulado é recalculado do zero
 * - decisão 17.2: valor zero sai como `-` no PDF
 * - decisão 13.3: produção zero é rejeitada
 * - valores reais da planilha: 2210.392 e o acumulado 15027.032
 *
 * Nenhuma expectativa foi lida da implementação. Os totais abaixo foram
 * conferidos contra a planilha de referência.
 */

describe('deTextoDoUsuario', () => {
  it('aceita decimal com vírgula, que é como o encarregado digita', () => {
    const r = deTextoDoUsuario('2210,392');
    expect(r.ok).toBe(true);
    if (r.ok) expect(formataBr(r.valor)).toBe('2.210,392');
  });

  it('aceita decimal com ponto', () => {
    const r = deTextoDoUsuario('2210.392');
    expect(r.ok).toBe(true);
    if (r.ok) expect(paraMilesimos(r.valor)).toBe(2210392);
  });

  it('aceita inteiro', () => {
    const r = deTextoDoUsuario('1884');
    expect(r.ok).toBe(true);
    if (r.ok) expect(paraMilesimos(r.valor)).toBe(1884000);
  });

  // Decisão 13.3: produção zero é rejeitada. "Não houve produção" é a ausência
  // do lançamento, não um lançamento de zero.
  it('rejeita zero', () => {
    expect(deTextoDoUsuario('0').ok).toBe(false);
    expect(deTextoDoUsuario('0,000').ok).toBe(false);
  });

  it('rejeita negativo', () => {
    expect(deTextoDoUsuario('-5').ok).toBe(false);
  });

  // Fronteira: 3 casas é a escala do domínio; a quarta é rejeitada, não
  // arredondada em silêncio.
  it('aceita exatamente três casas decimais', () => {
    expect(deTextoDoUsuario('1,234').ok).toBe(true);
  });

  it('rejeita quatro casas decimais em vez de arredondar', () => {
    expect(deTextoDoUsuario('1,2345').ok).toBe(false);
  });

  it('rejeita texto que não é número', () => {
    expect(deTextoDoUsuario('').ok).toBe(false);
    expect(deTextoDoUsuario('abc').ok).toBe(false);
    expect(deTextoDoUsuario('1,2,3').ok).toBe(false);
    expect(deTextoDoUsuario('1e3').ok).toBe(false);
  });
});

describe('soma', () => {
  /**
   * O teste que justifica decimal.js existir no projeto.
   * Em ponto flutuante binário, 0,1 + 0,2 dá 0,30000000000000004.
   */
  it('soma decimais sem erro de ponto flutuante', () => {
    const a = deMilesimos(100);
    const b = deMilesimos(200);
    expect(paraMilesimos(soma([a, b]))).toBe(300);
    expect(formataBr(soma([a, b]))).toBe('0,300');
  });

  it('soma vazia dá zero', () => {
    expect(paraMilesimos(soma([]))).toBe(0);
    expect(paraMilesimos(zero())).toBe(0);
  });

  /**
   * Acumulado real de REC.(FRESA+CAPA) na planilha de referência: os oito
   * lançamentos somam 15.027,032. Conferido célula a célula em PRODUÇÃO!D2.
   */
  it('reproduz o acumulado real da planilha', () => {
    const lancamentos = [
      '1012,2',
      '2210,392',
      '1328',
      '2742',
      '2992',
      '2020,84',
      '1334',
      '1387,6',
    ].map((t) => {
      const r = deTextoDoUsuario(t);
      if (!r.ok) throw new Error(`fixture inválida: ${t}`);
      return r.valor;
    });

    expect(formataBr(soma(lancamentos))).toBe('15.027,032');
  });

  /** O outro serviço da planilha: IM.(SUBLEITO+BASE+CAPA) soma 14.163,33. */
  it('reproduz o segundo acumulado real da planilha', () => {
    const lancamentos = [
      '1260',
      '1683',
      '1069,55',
      '3220',
      '1581,16',
      '3465,62',
      '1884',
    ].map((t) => {
      const r = deTextoDoUsuario(t);
      if (!r.ok) throw new Error(`fixture inválida: ${t}`);
      return r.valor;
    });

    expect(formataBr(soma(lancamentos))).toBe('14.163,330');
  });
});

describe('formataBr', () => {
  // skill fidelidade-documento: separador de milhar brasileiro.
  it('usa ponto para milhar e vírgula para decimal', () => {
    expect(formataBr(deMilesimos(15027032))).toBe('15.027,032');
    expect(formataBr(deMilesimos(1884000))).toBe('1.884,000');
  });

  it('não usa o separador americano', () => {
    expect(formataBr(deMilesimos(15027032))).not.toContain('15,027');
  });
});

describe('formataBrOuTraco', () => {
  // Decisão 17.2: valor zero sai como traço no PDF, não como 0,00.
  it('mostra traço quando o valor é zero', () => {
    expect(formataBrOuTraco(zero())).toBe('-');
    expect(formataBrOuTraco(deMilesimos(0))).toBe('-');
  });

  it('mostra o número quando não é zero', () => {
    expect(formataBrOuTraco(deMilesimos(1884000))).toBe('1.884,000');
  });
});

describe('divideParaPercentual', () => {
  it('calcula a fração do projeto executada', () => {
    const acumulado = deMilesimos(15027032);
    const projeto = deMilesimos(33074880);
    const p = divideParaPercentual(acumulado, projeto);
    expect(p).not.toBeNull();
    // 15027,032 / 33074,88 = 0,45433... conferido em PRODUÇÃO!E2 da planilha.
    if (p !== null) expect(p.toFixed(4)).toBe('0.4543');
  });

  // Fronteira: acumulado igual ao projeto é exatamente 100%.
  it('dá exatamente 1 quando o acumulado iguala o projeto', () => {
    const v = deMilesimos(1000);
    const p = divideParaPercentual(v, v);
    expect(p).not.toBeNull();
    if (p !== null) expect(p.toNumber()).toBe(1);
  });

  // Caso de teste obrigatório 6: passar do projeto é permitido, gera aviso.
  it('passa de 1 quando o acumulado supera o projeto', () => {
    const p = divideParaPercentual(deMilesimos(2000), deMilesimos(1000));
    expect(p).not.toBeNull();
    if (p !== null) expect(p.toNumber()).toBe(2);
  });

  // Decisão 13.4 rejeita projeto zero no cadastro; se existir, não divide.
  it('devolve nulo quando o projeto é zero, em vez de estourar', () => {
    expect(divideParaPercentual(deMilesimos(1000), zero())).toBeNull();
  });
});

describe('conversão para o banco', () => {
  it('vai e volta sem perder casa', () => {
    const r = deTextoDoUsuario('2210,392');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const milesimos = paraMilesimos(r.valor);
    expect(milesimos).toBe(2210392);
    expect(Number.isInteger(milesimos)).toBe(true);
    expect(formataBr(deMilesimos(milesimos))).toBe('2.210,392');
  });
});
