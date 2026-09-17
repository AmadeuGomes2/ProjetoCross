/**
 * O painel dos últimos dias, testado sem banco e sem tela.
 *
 * A expectativa sai da regra, não da implementação: a decisão 4.2 separa **não
 * lançado** de **parado**. Ninguém ter lançado nada é ausência de informação;
 * ter lançado que não houve trabalho é informação. O painel existe justamente
 * para mostrar a diferença, e por isso ela é o primeiro caso aqui.
 */

import { describe, expect, it } from 'vitest';

import { diaPuroConfiavel } from '../../shared/date/dia';
import { idConfiavel } from '../../shared/id';
import type { ObraId } from '../../shared/id';
import { janelaDeDias, montaPainelDosDias } from './painel';
import type { DiaDeObra } from './tipos';

const OBRA = idConfiavel<'obra'>('11111111-1111-4111-8111-111111111111');
const ALGUEM = idConfiavel<'usuario'>('22222222-2222-4222-8222-222222222222');

function dia(data: string, extra: Partial<DiaDeObra> = {}): DiaDeObra {
  return {
    obraId: OBRA as ObraId,
    data: diaPuroConfiavel(data),
    estado: 'trabalhado',
    motivoParada: null,
    registradoPor: ALGUEM,
    registradoEm: '2026-09-10T12:00:00.000Z',
    atualizadoPor: null,
    atualizadoEm: null,
    fechadoPor: null,
    fechadoEm: null,
    numeroRdoCongelado: null,
    ...extra,
  };
}

describe('janelaDeDias', () => {
  it('devolve o dia final primeiro e caminha para trás', () => {
    expect(janelaDeDias(diaPuroConfiavel('2026-09-16'), 3)).toEqual([
      '2026-09-16',
      '2026-09-15',
      '2026-09-14',
    ]);
  });

  it('atravessa a virada do mês sem depender de Date', () => {
    expect(janelaDeDias(diaPuroConfiavel('2026-03-02'), 3)).toEqual([
      '2026-03-02',
      '2026-03-01',
      '2026-02-28',
    ]);
  });

  it('atravessa 29 de fevereiro em ano bissexto', () => {
    expect(janelaDeDias(diaPuroConfiavel('2024-03-01'), 2)).toEqual([
      '2024-03-01',
      '2024-02-29',
    ]);
  });

  it('não devolve nada quando a quantidade não é positiva', () => {
    expect(janelaDeDias(diaPuroConfiavel('2026-09-16'), 0)).toEqual([]);
    expect(janelaDeDias(diaPuroConfiavel('2026-09-16'), -3)).toEqual([]);
  });
});

describe('montaPainelDosDias', () => {
  it('distingue não lançado de parado (decisão 4.2)', () => {
    const painel = montaPainelDosDias(janelaDeDias(diaPuroConfiavel('2026-09-16'), 3), [
      dia('2026-09-15', { estado: 'parado', motivoParada: 'Chuva forte o dia todo' }),
    ]);

    expect(painel.map((d) => [d.data, d.estado])).toEqual([
      ['2026-09-16', 'nao_lancado'],
      ['2026-09-15', 'parado'],
      ['2026-09-14', 'nao_lancado'],
    ]);
    expect(painel[1]?.motivoParada).toBe('Chuva forte o dia todo');
  });

  it('não inventa motivo para o dia que ninguém lançou', () => {
    const painel = montaPainelDosDias(
      janelaDeDias(diaPuroConfiavel('2026-09-16'), 1),
      [],
    );
    expect(painel[0]?.motivoParada).toBeNull();
    expect(painel[0]?.fechado).toBe(false);
  });

  it('marca fechado pelo instante de fechamento, não pelo autor', () => {
    const painel = montaPainelDosDias(janelaDeDias(diaPuroConfiavel('2026-09-16'), 2), [
      dia('2026-09-16', { fechadoPor: ALGUEM, fechadoEm: '2026-09-16T22:00:00.000Z' }),
      dia('2026-09-15'),
    ]);

    expect(painel[0]?.fechado).toBe(true);
    expect(painel[1]?.fechado).toBe(false);
  });

  it('ignora linha fora da janela em vez de esticá-la', () => {
    const painel = montaPainelDosDias(janelaDeDias(diaPuroConfiavel('2026-09-16'), 2), [
      dia('2026-09-16'),
      dia('2026-08-01', { estado: 'parado', motivoParada: 'Feriado' }),
    ]);

    expect(painel).toHaveLength(2);
    expect(painel.map((d) => d.data)).toEqual(['2026-09-16', '2026-09-15']);
  });

  it('preserva o número do RDO congelado, que é o que o fiscal recebeu', () => {
    const painel = montaPainelDosDias(janelaDeDias(diaPuroConfiavel('2026-09-16'), 1), [
      dia('2026-09-16', {
        fechadoPor: ALGUEM,
        fechadoEm: '2026-09-16T22:00:00.000Z',
        numeroRdoCongelado: 210,
      }),
    ]);

    expect(painel[0]?.numeroRdo).toBe(210);
  });

  it('deixa o número do RDO nulo enquanto o dia está aberto', () => {
    const painel = montaPainelDosDias(janelaDeDias(diaPuroConfiavel('2026-09-16'), 1), [
      dia('2026-09-16'),
    ]);
    expect(painel[0]?.numeroRdo).toBeNull();
  });
});
