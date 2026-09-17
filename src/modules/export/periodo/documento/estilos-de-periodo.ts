/**
 * Os poucos estilos que o consolidado acrescenta.
 *
 * Tudo o mais vem de `../../documento/estilos`, sem cópia: o consolidado é o
 * mesmo quadro fechado do gabarito, com os mesmos rótulos e a mesma régua. O
 * que não existe no diário é a **linha que separa os grupos por data**, porque
 * no diário só há um dia e nada precisa separar.
 */

import { StyleSheet } from '@react-pdf/renderer';

import { BORDA } from '../../documento/estilos';

export const estilosDePeriodo = StyleSheet.create({
  /** Faixa de data que abre o grupo de um dia, dentro de ATIVIDADES e de COMENTÁRIOS. */
  linhaDeData: {
    flexDirection: 'row',
    borderBottom: BORDA,
    backgroundColor: '#e6e6e6',
  },
  data: { flex: 1, padding: 2, fontFamily: 'Helvetica-Bold' },
});
