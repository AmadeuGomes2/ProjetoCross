/**
 * Pluviometria do consolidado — bloco 9.
 *
 * DP4: total de mm no período, contagem de dias por letra e contagem de dias
 * parados.
 *
 * Três coisas que parecem detalhe e são regra:
 *
 * - **o total soma só os dias com lançamento.** Ausência não é zero, e é a
 *   distinção que denuncia o defeito B5 da planilha, em que os quatro campos
 *   saíam vazios nos 31 dias e ninguém via;
 * - **índice zero é um lançamento**, e não ausência (decisão 3.2): choveu, mas
 *   não acumulou milímetro nenhum;
 * - **`diasParados` vem do estado do dia**, não da leitura. Está neste bloco
 *   porque DP4 descreve o bloco do documento assim; a fonte é `diasDeObra`, e
 *   quem procurar na pluviometria não vai achar.
 */

import { soma, type Quantidade } from '../../../shared/decimal';
import { formataIndiceMm } from '../formata';
import type { PluviometriaDoDia } from '../portas';
import { piorLetraDoDia } from './letra-do-dia';
import type { EstadoDoRdo } from '../tipos';
import type { PluviometriaDoPeriodo } from './tipos';

export interface DiaParaPluviometria {
  readonly leitura: PluviometriaDoDia | null;
  readonly estado: EstadoDoRdo;
}

export function calculaPluviometriaDoPeriodo(
  dias: readonly DiaParaPluviometria[],
): PluviometriaDoPeriodo {
  const indices: Quantidade[] = [];
  let diasB = 0;
  let diasC = 0;
  let diasI = 0;
  let diasSemLeitura = 0;
  let diasParados = 0;

  for (const { leitura, estado } of dias) {
    if (estado === 'parado') diasParados += 1;
    if (leitura !== null) indices.push(leitura.indiceMm);

    switch (piorLetraDoDia(leitura)) {
      case 'B':
        diasB += 1;
        break;
      case 'C':
        diasC += 1;
        break;
      case 'I':
        diasI += 1;
        break;
      default:
        diasSemLeitura += 1;
        break;
    }
  }

  // `soma([])` já é zero: um período sem leitura nenhuma tem total 0 mm, que é
  // uma soma vazia e não uma ausência. A ausência está em `diasSemLeitura`.
  const totalMm = soma(indices);

  return {
    totalMm,
    totalMmTexto: formataIndiceMm(totalMm),
    diasB,
    diasC,
    diasI,
    diasSemLeitura,
    diasParados,
  };
}
