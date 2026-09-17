/**
 * A média por dia do consolidado.
 *
 * DP2: efetivo de pessoal e de equipamento saem como **média por dia**, e o
 * divisor é o número de dias do conjunto **com registro**.
 *
 * Duas escolhas que precisam estar escritas:
 *
 * 1. **Divisor zero devolve `null`, não zero.** Conjunto sem nenhum dia lançado
 *    não tem média; dizer "0" afirmaria que ninguém trabalhou, que é coisa
 *    diferente de "ninguém lançou". Quem distingue os dois na tela é o aviso
 *    `PERIODO_SEM_DIA_LANCADO`.
 * 2. **A divisão é com `Decimal` e materializa em milésimos**, a escala do
 *    domínio (`shared/decimal`, `ESCALA`). Ponto flutuante binário não serve
 *    para dividir 4 por 3 e depois comparar com o que o fiscal confere na mão.
 *    Decisão 9 de `docs/arquitetura/periodo.md`: a função vive aqui, e não em
 *    `shared/decimal`, para não tocar em `src/shared/**` durante o trabalho
 *    paralelo. É o ponto pendente PP-3, e mudá-lo é trocar estas duas linhas.
 *
 * A exibição usa **uma casa decimal**, e média zero sai **em branco**, pela
 * mesma razão do bloco 5 do gabarito, em que quantidade zero é célula vazia
 * (`../efetivo.ts`). Arredondar só na exibição, nunca no meio da conta.
 */

import Decimal from 'decimal.js';

import { deMilesimos, ESCALA, type Quantidade } from '../../../shared/decimal';

const FATOR = 10 ** ESCALA;

const FORMATADOR_DA_MEDIA = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function mediaPorDia(soma: number, dias: number): Quantidade | null {
  if (dias <= 0) return null;
  const milesimos = new Decimal(soma)
    .times(FATOR)
    .dividedBy(dias)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return deMilesimos(milesimos.toNumber());
}

export function formataMedia(media: Quantidade | null): string {
  if (media === null || media.isZero()) return '';
  return FORMATADOR_DA_MEDIA.format(media.toNumber());
}
