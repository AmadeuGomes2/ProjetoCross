import type { DiaPuro } from './dia';

/**
 * A pessoa ou o equipamento está na obra no dia consultado?
 *
 * Decisão 1.1 de 16/09/2026: a data de saída é o ÚLTIMO DIA TRABALHADO, logo a
 * pessoa CONTA no dia em que sai. Decisão 1.2: equipamento segue a mesma regra.
 *
 * Por isso `saida >= dia`, e não `saida > dia`.
 *
 * A planilha legada respondia das duas formas ao mesmo tempo: `<=` nas colunas
 * B:S e `<` em T:AP do bloco de efetivo, e uma terceira forma no bloco de
 * equipamento. Qual resposta você recebia dependia da coluna em que a sua
 * função tinha caído, ou seja, de posição e não de regra. Ver
 * docs/dominio/regras-extraidas.md, seção 1.1.
 *
 * Esta é a ÚNICA implementação da regra no sistema. Módulo que a reescreva está
 * criando a segunda verdade que a divergência da planilha provou ser cara.
 *
 * Saída anterior à entrada não cobre dia nenhum. O cadastro rejeita esse dado
 * antes de gravar, mas se ele existir a função não vai afirmar que alguém
 * trabalhou.
 */
export function intervaloCobreODia(
  entrada: DiaPuro | string,
  saida: DiaPuro | string | null,
  dia: DiaPuro | string,
): boolean {
  if (saida !== null && saida < entrada) return false;
  if (dia < entrada) return false;
  if (saida !== null && dia > saida) return false;
  return true;
}

/**
 * Alguma das passagens cobre o dia?
 *
 * Uma pessoa que sai e volta tem duas passagens e continua sendo UMA pessoa
 * (caso de teste obrigatório 8). Quem conta o efetivo usa esta função por
 * pessoa, não por linha de passagem: contar linhas daria dois.
 */
export function algumaPassagemCobreODia(
  passagens: ReadonlyArray<{ readonly entrada: string; readonly saida: string | null }>,
  dia: DiaPuro | string,
): boolean {
  return passagens.some((p) => intervaloCobreODia(p.entrada, p.saida, dia));
}
