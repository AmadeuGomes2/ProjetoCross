/**
 * A letra do dia, para a contagem de DP4.
 *
 * DP5: a letra do dia é a **pior dos três turnos**. A gravidade vem da própria
 * taxonomia (`shared/taxonomia`, `LETRAS_DE_TURNO`): `B` bom, `C` chuva, `I`
 * impraticável. Logo `I` é pior que `C`, que é pior que `B`.
 *
 * **Isto não é o resumo do dia** (`../resumo-do-dia.ts`), e a diferença é
 * intencional. Lá a ordem da árvore manda mais que a gravidade — um dia com `C`
 * e `I` e índice 9 sai `Trabalhado`, porque o passo 2 responde antes do passo
 * 4 —, e essa ordem é herdada da planilha. Aqui a pergunta é outra: quantos
 * dias do período foram impraticáveis. Reusar a árvore do resumo responderia à
 * pergunta errada.
 *
 * **Turno em branco é ignorado** na escolha, e o dia com os três em branco não
 * tem letra. É o ponto pendente PP-2 de `docs/arquitetura/periodo.md`: DP5 não
 * disse o que fazer e a decisão 2.2 aceita turno vazio. A suposição está isolada
 * nesta função, e a resposta muda uma linha.
 */

import type { LetraDeTurno } from '../../../shared/taxonomia';
import type { PluviometriaDoDia } from '../portas';

const GRAVIDADE: Readonly<Record<LetraDeTurno, number>> = { B: 1, C: 2, I: 3 };

/** `null` quando não houve leitura ou quando os três turnos estão em branco. */
export function piorLetraDoDia(leitura: PluviometriaDoDia | null): LetraDeTurno | null {
  if (leitura === null) return null;

  let pior: LetraDeTurno | null = null;
  for (const turno of [leitura.noiteAnterior, leitura.manha, leitura.tarde]) {
    if (turno === null) continue;
    if (pior === null || GRAVIDADE[turno] > GRAVIDADE[pior]) pior = turno;
  }
  return pior;
}
