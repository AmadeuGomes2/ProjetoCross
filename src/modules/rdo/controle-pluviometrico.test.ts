/**
 * O controle pluviométrico do mês — a aba `PLUVIOMETRIA` da planilha.
 *
 * As expectativas saem de `docs/dominio/mapa-planilha.md`, seção
 * `PLUVIOMETRIA`, e não da implementação:
 *
 * - cabeçalho `DATA`, `D. DA SEMANA`, os três turnos, `RESUMO DO DIA`, `INDICE`
 *   e `INDICE ACUMUALDO`, esta última com a grafia errada que se herda;
 * - `H3` repete o índice do primeiro dia; `H4` em diante soma o acumulado
 *   anterior com o índice do dia;
 * - o painel lateral conta as ocorrências da coluna `RESUMO DO DIA`.
 *
 * O que a planilha não consegue responder, porque os 31 dias dela estão com 0:
 * **o que o acumulado faz num dia sem leitura**. A resposta aqui é carregar o
 * anterior, que é o que o próprio Excel faria com a célula vazia em `G`, e é a
 * única leitura possível de um total corrente.
 */

import { describe, expect, it } from 'vitest';

import { deMilesimos } from '../../shared/decimal';
import { diaPuroConfiavel } from '../../shared/date/dia';
import type { LetraDeTurno } from '../../shared/taxonomia';
import { montaControlePluviometrico, type DiaDoControle } from './controle-pluviometrico';

/** Um dia com leitura. `mm` em milímetros inteiros, como o pluviômetro marca. */
function dia(
  data: string,
  turnos: readonly [LetraDeTurno | null, LetraDeTurno | null, LetraDeTurno | null],
  mm: number,
): DiaDoControle {
  const [noiteAnterior, manha, tarde] = turnos;
  return {
    data: diaPuroConfiavel(data),
    leitura: { noiteAnterior, manha, tarde, indiceMm: deMilesimos(mm * 1000) },
  };
}

/** Um dia sem nenhum lançamento de pluviometria. */
function semLeitura(data: string): DiaDoControle {
  return { data: diaPuroConfiavel(data), leitura: null };
}

describe('controle pluviométrico do mês', () => {
  it('acumula o índice dia a dia, começando pelo primeiro', () => {
    const c = montaControlePluviometrico([
      dia('2026-07-01', ['C', 'B', 'B'], 4),
      dia('2026-07-02', ['B', 'C', 'B'], 6),
      dia('2026-07-03', ['B', 'B', 'C'], 5),
    ]);

    expect(c.linhas.map((l) => l.indiceTexto)).toEqual(['4 mm', '6 mm', '5 mm']);
    expect(c.linhas.map((l) => l.acumuladoTexto)).toEqual(['4 mm', '10 mm', '15 mm']);
    expect(c.totalMmTexto).toBe('15 mm');
  });

  it('num dia sem leitura o índice sai vazio e o acumulado carrega o anterior', () => {
    const c = montaControlePluviometrico([
      dia('2026-07-01', ['C', 'B', 'B'], 7),
      semLeitura('2026-07-02'),
      dia('2026-07-03', ['B', 'C', 'B'], 3),
    ]);

    // Ausência não é zero: a coluna do dia fica vazia.
    expect(c.linhas.map((l) => l.indiceTexto)).toEqual(['7 mm', '', '3 mm']);
    // O acumulado é total corrente, e não pode ter buraco.
    expect(c.linhas.map((l) => l.acumuladoTexto)).toEqual(['7 mm', '7 mm', '10 mm']);
    // A ausência é dita, e não deduzida do texto vazio.
    expect(c.linhas.map((l) => l.leituraAusente)).toEqual([false, true, false]);
  });

  it('o mês sem chuva nenhuma acumula zero, e o zero aparece', () => {
    const c = montaControlePluviometrico([
      dia('2026-07-01', ['B', 'B', 'B'], 0),
      dia('2026-07-02', ['B', 'B', 'B'], 0),
    ]);

    // É o defeito B5 da planilha ao contrário: zero preenchido é diferente de
    // vazio, e os dois precisam ser distinguíveis a olho.
    expect(c.linhas.map((l) => l.indiceTexto)).toEqual(['0 mm', '0 mm']);
    expect(c.linhas.every((l) => !l.leituraAusente)).toBe(true);
    expect(c.totalMmTexto).toBe('0 mm');
  });

  it('traz a data em BR e o dia da semana com a grafia do documento', () => {
    const c = montaControlePluviometrico([dia('2026-07-01', ['B', 'B', 'B'], 0)]);
    const [linha] = c.linhas;

    expect(linha?.dataBr).toBe('01/07/2026');
    // 01/07/2026 é uma quarta-feira.
    expect(linha?.diaDaSemana).toBe('Quarta-Feira');
  });

  it('o resumo do dia sai da mesma árvore do RDO, inclusive na fronteira dos 10 mm', () => {
    const c = montaControlePluviometrico([
      dia('2026-07-01', ['B', 'B', 'B'], 0), // três B
      dia('2026-07-02', ['C', 'B', 'B'], 9), // chuva abaixo de 10
      dia('2026-07-03', ['C', 'B', 'B'], 10), // exatamente 10, o caso 3
      dia('2026-07-04', ['I', 'B', 'B'], 0), // impraticável
      semLeitura('2026-07-05'),
    ]);

    expect(c.linhas.map((l) => l.resumo)).toEqual([
      'Trabalhado',
      'Trabalhado',
      'Perca de produção',
      'Impraticavél',
      null,
    ]);
  });

  it('o painel do mês conta as ocorrências da coluna RESUMO DO DIA', () => {
    const c = montaControlePluviometrico([
      dia('2026-07-01', ['B', 'B', 'B'], 0),
      dia('2026-07-02', ['B', 'B', 'B'], 0),
      dia('2026-07-03', ['C', 'B', 'B'], 12),
      dia('2026-07-04', ['I', 'B', 'B'], 0),
      semLeitura('2026-07-05'),
    ]);

    expect(c.diasTrabalhado).toBe(2);
    expect(c.diasPerca).toBe(1);
    expect(c.diasImpraticavel).toBe(1);
    expect(c.diasSemLeitura).toBe(1);
  });

  it('um mês sem nenhum dia não quebra, e o total é zero', () => {
    const c = montaControlePluviometrico([]);

    expect(c.linhas).toHaveLength(0);
    expect(c.totalMmTexto).toBe('0 mm');
    expect(c.diasTrabalhado).toBe(0);
  });

  it('respeita a ordem recebida e não reordena por conta própria', () => {
    // Quem chama monta o intervalo; reordenar aqui esconderia um defeito lá.
    const c = montaControlePluviometrico([
      dia('2026-07-02', ['C', 'B', 'B'], 2),
      dia('2026-07-01', ['C', 'B', 'B'], 1),
    ]);

    expect(c.linhas.map((l) => l.dataBr)).toEqual(['02/07/2026', '01/07/2026']);
  });
});
