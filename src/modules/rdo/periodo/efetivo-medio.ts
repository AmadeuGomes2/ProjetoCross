/**
 * Efetivo médio do consolidado — blocos 5 e 6.
 *
 * **A regra de quem está na obra no dia não é reescrita aqui.** Quem responde
 * isso continua sendo `../efetivo.ts`, que por sua vez delega a
 * `shared/date/intervalo.ts` — o dia da saída (decisão 1.1), a pessoa com duas
 * passagens (caso obrigatório 8) e o zeramento em dia parado (decisão 5.1)
 * valem por construção, num lugar só. Este arquivo só faz a média dos blocos
 * diários que aquele produziu.
 *
 * Duas fronteiras, e são as duas de DP2:
 *
 * - **dia não lançado fica fora do divisor e fora do numerador.** Ele entra na
 *   lista só para que as colunas do cadastro existam mesmo num conjunto em que
 *   ninguém lançou nada;
 * - **dia parado fica dentro do divisor**, somando zero, e puxa a média para
 *   baixo. É a consequência querida de DP2 com a decisão 5.1.
 *
 * A `mediaTotal` sai dos **totais diários**. Somar as médias já arredondadas
 * das colunas dá outro número quando há resíduo de arredondamento, e "consertar"
 * o total para bater com o que está impresso é exatamente o defeito de planilha
 * que este projeto não herda.
 */

import type { BlocoDeEfetivo } from '../efetivo';
import { formataMedia, mediaPorDia } from './media';
import type { BlocoDeEfetivoMedio, ColunaDeEfetivoMedio } from './tipos';

export interface EfetivoDeUmDia {
  readonly bloco: BlocoDeEfetivo;
  /** `false` para o dia sem registro: DP2 o tira do divisor e da soma. */
  readonly entraNaMedia: boolean;
}

export function calculaEfetivoMedio(
  dias: readonly EfetivoDeUmDia[],
): BlocoDeEfetivoMedio {
  // A ordem de inserção do `Map` é a ordem das colunas do cadastro, que
  // `calculaEfetivoPessoal` já ordenou. Não se reordena aqui.
  const somaPorChave = new Map<string, { rotulo: string; soma: number }>();
  let somaDosTotaisDiarios = 0;
  let diasConsiderados = 0;

  for (const { bloco, entraNaMedia } of dias) {
    if (entraNaMedia) {
      diasConsiderados += 1;
      somaDosTotaisDiarios += bloco.total;
    }
    for (const coluna of bloco.colunas) {
      const acumulada = somaPorChave.get(coluna.chave);
      if (acumulada === undefined) {
        somaPorChave.set(coluna.chave, {
          rotulo: coluna.rotulo,
          soma: entraNaMedia ? coluna.quantidade : 0,
        });
        continue;
      }
      if (entraNaMedia) acumulada.soma += coluna.quantidade;
    }
  }

  const colunas: readonly ColunaDeEfetivoMedio[] = [...somaPorChave.entries()].map(
    ([chave, { rotulo, soma }]) => {
      const media = mediaPorDia(soma, diasConsiderados);
      return {
        chave,
        rotulo,
        somaDoPeriodo: soma,
        mediaPorDia: media,
        mediaTexto: formataMedia(media),
      };
    },
  );

  const mediaTotal = mediaPorDia(somaDosTotaisDiarios, diasConsiderados);

  return {
    colunas,
    diasConsiderados,
    mediaTotal,
    mediaTotalTexto: formataMedia(mediaTotal),
  };
}
