/**
 * Tipos das telas de cadastro.
 *
 * Moram fora de `acoes.ts` porque um arquivo `'use server'` só pode exportar
 * função assíncrona; tipo exportado dali é ruído que o empacotador precisa
 * adivinhar.
 */

import type { Perfil } from '../../modules/acesso';

export interface EstadoDoConvite {
  /** Link de uso único, exibido **uma vez**. Nunca vai para a URL nem para o log. */
  readonly link: string | null;
  /**
   * O perfil que o link concede (34.1). A tela repete o que foi pedido: quem
   * gera dois links seguidos precisa saber qual é qual antes de mandar.
   */
  readonly perfil: Perfil | null;
  readonly erro: string | null;
}

export const ESTADO_INICIAL_DO_CONVITE: EstadoDoConvite = {
  link: null,
  perfil: null,
  erro: null,
};
