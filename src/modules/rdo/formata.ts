/**
 * Formatação de exibição do RDO.
 *
 * Fica num lugar só para que a tela e o PDF mostrem exatamente o mesmo texto
 * (cenário "mesmo conteúdo do RDO na tela", R18). Quantidade de produção e
 * percentual já têm formatação em `shared/decimal`; aqui só o que é do RDO.
 */

import type { Quantidade } from '../../shared/decimal';

const FORMATADOR_DO_INDICE = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
});

/**
 * Índice pluviométrico com o sufixo do gabarito.
 *
 * Sai `8 mm`, e `0 mm` quando choveu zero — o bloco preenchido com zero é
 * diferente do bloco vazio (CT-257), e distinguir os dois é o que denuncia o
 * defeito B5 da planilha, em que os quatro campos saíam vazios nos 31 dias.
 * Sem lançamento, sai vazio: ausência não é zero.
 *
 * Exibe sem casas quando o valor é inteiro, que é como o gabarito imprime.
 */
export function formataIndiceMm(indice: Quantidade | null): string {
  if (indice === null) return '';
  return `${FORMATADOR_DO_INDICE.format(indice.toNumber())} mm`;
}
