/**
 * CT-214 a CT-226 — bloco 9 e resumo do dia.
 * Casos em `docs/qa/v1-casos-passo-5.md`, funcionalidade F5.5 do PRD.
 *
 * Origem das expectativas: a árvore de decisão de R7, com as correções de
 * 16/09/2026. Na ordem, parando na primeira verdadeira:
 *
 *   1. três letras B                   -> "Trabalhado"
 *   2. existe C  e  índice <  10       -> "Trabalhado"
 *   3. existe C  e  índice >= 10       -> "Perca de produção"   (decisão 3.1)
 *   4. existe I                        -> "Impraticavél"
 *   5. caso contrário                  -> vazio
 *
 * A planilha testava `< 10` e `> 10` e deixava o 10 exato cair no vazio. Se
 * este arquivo tivesse sido escrito lendo a fórmula, o vazio estaria congelado
 * como comportamento correto para sempre. As grafias `Perca de produção` e
 * `Impraticavél` são vocabulário herdado do cliente e não se corrigem.
 *
 * Decisão 2.3: o bloco mostra a LETRA do turno, não a palavra por extenso.
 * Decisão 3.3: o resumo aparece na tela e nunca no PDF.
 */

import { describe, expect, it } from 'vitest';

import { RESUMO_DO_DIA } from '../../shared/taxonomia';
import { calculaResumoDoDia } from './resumo-do-dia';
import { montaOuFalha } from './teste/ajuda';
import { leituraDePluviometro } from './teste/duplas';

describe('árvore do resumo do dia (R7, decisões 3.1 e 3.2)', () => {
  it('três B dão Trabalhado', () => {
    // CT-216, passo 1: o dia mais comum da obra.
    expect(calculaResumoDoDia(leituraDePluviometro('B', 'B', 'B', 0))).toBe(
      RESUMO_DO_DIA.TRABALHADO,
    );
  });

  it('chuva com índice 9 dá Trabalhado', () => {
    // CT-217, passo 2: último valor abaixo da fronteira.
    expect(calculaResumoDoDia(leituraDePluviometro('C', 'B', 'B', 9))).toBe(
      RESUMO_DO_DIA.TRABALHADO,
    );
  });

  it('chuva com índice exatamente 10 dá Perca de produção', () => {
    // CT-218, caso obrigatório 3, decisão 3.1: o buraco da planilha fechado.
    expect(calculaResumoDoDia(leituraDePluviometro('C', 'B', 'B', 10))).toBe(
      'Perca de produção',
    );
  });

  it('chuva com índice 11 dá Perca de produção', () => {
    // CT-219: primeiro valor acima da fronteira.
    expect(calculaResumoDoDia(leituraDePluviometro('C', 'B', 'B', 11))).toBe(
      RESUMO_DO_DIA.PERCA,
    );
  });

  it('chuva com índice 0 continua Trabalhado', () => {
    // CT-220, decisão 3.2: é intencional, e é o valor que a intuição quer
    // mandar para "Perca de produção".
    expect(calculaResumoDoDia(leituraDePluviometro('C', 'B', 'B', 0))).toBe(
      RESUMO_DO_DIA.TRABALHADO,
    );
  });

  it('impraticável sem chuva dá Impraticavél', () => {
    // CT-221, passo 4, com a grafia herdada.
    expect(calculaResumoDoDia(leituraDePluviometro('B', 'B', 'I', 0))).toBe(
      'Impraticavél',
    );
  });

  it('chuva com 11 e impraticável dá Perca de produção, porque o passo 3 vem antes', () => {
    // CT-222: avaliar em qualquer outra ordem dá "Impraticavél".
    expect(calculaResumoDoDia(leituraDePluviometro('C', 'I', 'B', 11))).toBe(
      RESUMO_DO_DIA.PERCA,
    );
  });

  it('chuva com 9 e impraticável dá Trabalhado, porque o passo 2 vem antes', () => {
    // CT-223: contraintuitivo, e é o que a regra diz.
    expect(calculaResumoDoDia(leituraDePluviometro('C', 'I', 'B', 9))).toBe(
      RESUMO_DO_DIA.TRABALHADO,
    );
  });

  it('três turnos em branco dão resumo vazio, mesmo com índice alto', () => {
    // CT-224, passo 5: o único caminho legítimo para o vazio depois da 3.1.
    expect(calculaResumoDoDia(leituraDePluviometro(null, null, null, 20))).toBe(
      RESUMO_DO_DIA.VAZIO,
    );
  });

  it('não calcula resumo quando não houve lançamento de pluviometria', () => {
    // Ausência de lançamento não é vazio calculado: é ausência.
    expect(calculaResumoDoDia(null)).toBeNull();
  });

  it('dá Trabalhado com três B mesmo com índice acima de 10', () => {
    // Fronteira da ordem: o passo 1 vem antes do passo 3.
    expect(calculaResumoDoDia(leituraDePluviometro('B', 'B', 'B', 30))).toBe(
      RESUMO_DO_DIA.TRABALHADO,
    );
  });
});

describe('bloco 9 na tela (decisões 2.2 e 2.3)', () => {
  it('mostra a letra de cada turno e o índice com o sufixo mm', async () => {
    // CT-214: a letra é o que a fórmula da planilha imprime.
    const rdo = await montaOuFalha('2026-09-03', {
      pluviometria: { '2026-09-03': leituraDePluviometro('B', 'C', 'B', 8) },
    });
    expect(rdo.pluviometria.noiteAnterior).toBe('B');
    expect(rdo.pluviometria.manha).toBe('C');
    expect(rdo.pluviometria.tarde).toBe('B');
    expect(rdo.pluviometria.indiceTexto).toBe('8 mm');
  });

  it('deixa o turno em branco em branco, sem traço e sem zero', async () => {
    // CT-215: turno em branco é aceito no lançamento (2.2).
    const rdo = await montaOuFalha('2026-09-06', {
      pluviometria: { '2026-09-06': leituraDePluviometro('B', 'B', null, 0) },
    });
    expect(rdo.pluviometria.tarde).toBeNull();
    expect(rdo.pluviometria.indiceTexto).toBe('0 mm');
  });

  it('mostra o bloco vazio, e não zerado, quando não houve lançamento', async () => {
    // CT-225: ausência de lançamento não é erro nem zero, e o bloco não some.
    const rdo = await montaOuFalha('2026-09-09');
    expect(rdo.pluviometria.temLancamento).toBe(false);
    expect(rdo.pluviometria.noiteAnterior).toBeNull();
    expect(rdo.pluviometria.indiceTexto).toBe('');
  });

  it('mostra o resumo do dia na tela do RDO diário', async () => {
    // CT-226, decisão 3.3: o resumo vive na tela; CT-239 garante que ele não
    // vaza para o PDF.
    const rdo = await montaOuFalha('2026-09-10', {
      pluviometria: { '2026-09-10': leituraDePluviometro('C', 'B', 'B', 12) },
    });
    expect(rdo.resumoDoDia).toBe('Perca de produção');
  });
});
