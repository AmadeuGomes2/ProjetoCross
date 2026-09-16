/**
 * Tipos das telas de cadastro.
 *
 * Moram fora de `acoes.ts` porque um arquivo `'use server'` só pode exportar
 * função assíncrona; tipo exportado dali é ruído que o empacotador precisa
 * adivinhar.
 */

export interface EstadoDoConvite {
  /** Link de uso único, exibido **uma vez**. Nunca vai para a URL nem para o log. */
  readonly link: string | null;
  readonly erro: string | null;
}

export const ESTADO_INICIAL_DO_CONVITE: EstadoDoConvite = { link: null, erro: null };
