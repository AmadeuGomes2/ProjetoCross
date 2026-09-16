/**
 * Transbordo de página.
 *
 * Decisão 11.1: o dia que não cabe no layout ganha uma **segunda página de
 * continuação**, com o mesmo cabeçalho de identificação. Transbordo nunca é
 * truncamento silencioso, e o total nunca soma só o que coube na página 1.
 *
 * O cálculo mora no `rdo` porque é ele que conhece o conteúdo do dia; o
 * `export` só imprime o que já veio dividido.
 */

export interface Divisao<T> {
  readonly pagina1: readonly T[];
  readonly continuacao: readonly T[];
}

export function divideEmPaginas<T>(itens: readonly T[], limite: number): Divisao<T> {
  return { pagina1: itens.slice(0, limite), continuacao: itens.slice(limite) };
}

/**
 * Quebra o texto do comentário em linhas de largura fixa.
 *
 * A quebra de linha que a pessoa digitou é respeitada — o texto real de
 * observação já vem quebrado em três linhas que repetem a data (inconsistência
 * E8) —, e cada trecho é quebrado por palavra. Palavra maior que a linha é
 * cortada, porque a alternativa é estourar a largura do bloco no papel.
 */
export function quebraEmLinhas(texto: string, largura: number): readonly string[] {
  const linhas: string[] = [];

  for (const trecho of texto.split('\n')) {
    const palavras = trecho
      .trim()
      .split(/\s+/)
      .filter((p) => p !== '');
    if (palavras.length === 0) {
      linhas.push('');
      continue;
    }

    let atual = '';
    for (const palavra of palavras) {
      const candidata = atual === '' ? palavra : `${atual} ${palavra}`;
      if (candidata.length <= largura) {
        atual = candidata;
        continue;
      }
      if (atual !== '') linhas.push(atual);
      atual = palavra;
      while (atual.length > largura) {
        linhas.push(atual.slice(0, largura));
        atual = atual.slice(largura);
      }
    }
    if (atual !== '') linhas.push(atual);
  }

  return linhas;
}
