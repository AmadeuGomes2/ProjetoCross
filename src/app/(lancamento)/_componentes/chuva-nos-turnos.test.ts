/**
 * Quando a tela do dia precisa pedir o índice em mm.
 *
 * Origem da expectativa: decisão do dono do produto de 17/09/2026 — "se os três
 * turnos forem `B`, não choveu e o campo não precisa aparecer; se algum turno
 * for `C` ou `I`, choveu, e o campo precisa estar à vista pedindo quantos
 * milímetros". É decisão de VISIBILIDADE: o índice continua não sendo
 * obrigatório, e nada aqui valida o que foi digitado.
 *
 * Por que a regra existe: o índice é o que separa `Trabalhado` de
 * `Perca de produção` a partir de 10 mm (`regras-extraidas.md` §4, decisão
 * 3.1, implementada em `src/modules/rdo/resumo-do-dia.ts`). Sem turno `C` nem
 * `I` o número não muda resposta nenhuma; com chuva, ele decide o resumo do dia
 * e a contagem do mês.
 *
 * Fronteira que este arquivo trava de propósito: turno **em branco** não é
 * chuva. A regra fala em `C` e em `I`; ausência de leitura é ausência, e a
 * planilha já provou o custo de tratar vazio como valor (inconsistências, B5).
 */

import { describe, expect, it } from 'vitest';

import { temChuvaNosTurnos } from './chuva-nos-turnos';

describe('o índice em mm aparece quando choveu', () => {
  it('não pede o índice quando os três turnos são B', () => {
    expect(temChuvaNosTurnos({ noiteAnterior: 'B', manha: 'B', tarde: 'B' })).toBe(false);
  });

  it('pede o índice quando a noite anterior foi C', () => {
    expect(temChuvaNosTurnos({ noiteAnterior: 'C', manha: 'B', tarde: 'B' })).toBe(true);
  });

  it('pede o índice quando a manhã foi C', () => {
    expect(temChuvaNosTurnos({ noiteAnterior: 'B', manha: 'C', tarde: 'B' })).toBe(true);
  });

  it('pede o índice quando a tarde foi C', () => {
    expect(temChuvaNosTurnos({ noiteAnterior: 'B', manha: 'B', tarde: 'C' })).toBe(true);
  });

  it('pede o índice quando um turno foi I', () => {
    expect(temChuvaNosTurnos({ noiteAnterior: 'B', manha: 'B', tarde: 'I' })).toBe(true);
  });

  it('pede o índice com C e I no mesmo dia', () => {
    expect(temChuvaNosTurnos({ noiteAnterior: 'C', manha: 'I', tarde: 'B' })).toBe(true);
  });

  it('pede o índice quando o único turno informado foi C', () => {
    expect(temChuvaNosTurnos({ noiteAnterior: null, manha: 'C', tarde: null })).toBe(
      true,
    );
  });

  it('não pede o índice quando nenhum turno foi informado', () => {
    expect(temChuvaNosTurnos({ noiteAnterior: null, manha: null, tarde: null })).toBe(
      false,
    );
  });

  it('não pede o índice com turno em branco e os demais B', () => {
    expect(temChuvaNosTurnos({ noiteAnterior: null, manha: 'B', tarde: 'B' })).toBe(
      false,
    );
  });
});
