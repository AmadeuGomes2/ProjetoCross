import type { LetraDeTurno } from '../../../shared/taxonomia';

export interface TurnosNaTela {
  readonly noiteAnterior: LetraDeTurno | null;
  readonly manha: LetraDeTurno | null;
  readonly tarde: LetraDeTurno | null;
}

/**
 * Choveu em algum turno do dia?
 *
 * `C` é chuva e `I` é impraticável; `B` é bom e `null` é turno não informado.
 * A decisão do dono do produto de 17/09/2026 usa esta resposta para uma coisa
 * só: mostrar ou recolher o campo do índice em mm na tela do dia. Não é
 * validação — o índice continua opcional, e recolher o campo não apaga o que já
 * foi digitado.
 *
 * Fica fora do componente para poder ser testada sem renderizar nada, e fica
 * fora de `shared/` porque é a pergunta da TELA. A pergunta do DOCUMENTO é
 * outra e mais fina: `src/modules/rdo/resumo-do-dia.ts` pesa o índice contra os
 * 10 mm da decisão 3.1 e ainda distingue `C` de `I` pela ordem da árvore.
 */
export function temChuvaNosTurnos(turnos: TurnosNaTela): boolean {
  return [turnos.noiteAnterior, turnos.manha, turnos.tarde].some(
    (letra) => letra === 'C' || letra === 'I',
  );
}
