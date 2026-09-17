/**
 * A linha da planilha, antes de virar célula.
 *
 * Separar "quais linhas" de "como escrever" deixa o espelho do documento
 * verificável sem abrir um `.xlsx`: o teste lê a lista de linhas e confere
 * bloco, ordem e rótulo, que é o que a skill `fidelidade-documento` cobra.
 *
 * Só dois tipos de célula, e a diferença importa na hora de escrever:
 *
 * - **texto** é tudo que já veio formatado do domínio, e é forçado como texto
 *   na planilha. O `-` da produção zero começa com um caractere que o Excel lê
 *   como fórmula;
 * - **número** é contagem de dias, e só. Inteiro, sem formatação, para quem
 *   somar na planilha não ter que reconverter.
 */

export type CelulaDaPlanilha = string | number;
export type LinhaDaPlanilha = readonly CelulaDaPlanilha[];

/** Linha em branco entre blocos, como o quadro do gabarito separa. */
export const LINHA_VAZIA: LinhaDaPlanilha = [];
