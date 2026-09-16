/**
 * Quantidade de produção.
 *
 * Risco 4 do PRD: somar acumulado com ponto flutuante binário produz
 * `0,30000000000000004` e diverge da planilha. O domínio calcula com
 * `Decimal`; o banco guarda `INTEGER` em milésimos.
 *
 * A conversão acontece só aqui e no repositório, em duas funções, para que não
 * exista um terceiro lugar que decida a escala.
 */

import Decimal from 'decimal.js';

import { CODIGO_ERRO, erro, erroDeEntrada, ok, type Result } from '../result';
import type { ErroDeEntrada } from '../result';

/** Casas decimais do domínio. A planilha real tem valores como 2210,392. */
export const ESCALA = 3;

const FATOR = 10 ** ESCALA;

declare const marcaQuantidade: unique symbol;

export type Quantidade = Decimal & { readonly [marcaQuantidade]: true };

function marca(d: Decimal): Quantidade {
  return d as Quantidade;
}

export function zero(): Quantidade {
  return marca(new Decimal(0));
}

/** Só dígitos, com uma vírgula ou um ponto decimal. Nada de notação científica. */
const NUMERO_BR = /^-?\d+(?:[.,]\d+)?$/;

/**
 * Entrada digitada por pessoa.
 *
 * Aceita vírgula, que é como se digita em português, e ponto.
 * Rejeita, em vez de arredondar em silêncio, o valor com mais casas que a
 * escala: arredondar calado é como se perde tonelada de asfalto na conta.
 *
 * Decisão 13.3: zero é rejeitado. "Não houve produção" é a ausência do
 * lançamento, não um lançamento de zero.
 */
export function deTextoDoUsuario(bruto: string): Result<Quantidade, ErroDeEntrada> {
  const texto = bruto.trim();
  if (texto === '' || !NUMERO_BR.test(texto)) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.QUANTIDADE_INVALIDA,
        'Informe um número, usando vírgula para os decimais.',
      ),
    );
  }

  const normalizado = texto.replace(',', '.');
  const casas = normalizado.includes('.') ? (normalizado.split('.')[1] ?? '').length : 0;
  if (casas > ESCALA) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.QUANTIDADE_CASAS_DEMAIS,
        `Use no máximo ${ESCALA} casas decimais.`,
      ),
    );
  }

  let d: Decimal;
  try {
    d = new Decimal(normalizado);
  } catch {
    // decimal.js lança para entrada que o teste acima não pegou.
    // O erro é esperado: vira resultado, não exceção que sobe.
    return erro(
      erroDeEntrada(CODIGO_ERRO.QUANTIDADE_INVALIDA, 'Informe um número válido.'),
    );
  }

  if (d.lessThanOrEqualTo(0)) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.QUANTIDADE_NAO_POSITIVA,
        'A quantidade precisa ser maior que zero.',
      ),
    );
  }

  return ok(marca(d));
}

/** Do banco para o domínio. O banco guarda inteiro em milésimos. */
export function deMilesimos(milesimos: number): Quantidade {
  return marca(new Decimal(milesimos).dividedBy(FATOR));
}

/** Do domínio para o banco. Sempre inteiro. */
export function paraMilesimos(q: Quantidade): number {
  return q.times(FATOR).toDecimalPlaces(0).toNumber();
}

/**
 * Acumulado.
 *
 * Sempre recalculado do zero a partir dos lançamentos, nunca guardado
 * (regra R5). Corrigir um lançamento de março corrige setembro sozinho.
 */
export function soma(valores: readonly Quantidade[]): Quantidade {
  return marca(valores.reduce<Decimal>((total, v) => total.plus(v), new Decimal(0)));
}

export function ehZero(q: Quantidade): boolean {
  return q.isZero();
}

export function maiorQue(a: Quantidade, b: Quantidade): boolean {
  return a.greaterThan(b);
}

/**
 * Fração do projeto já executada.
 *
 * Devolve `null` quando não há denominador, em vez de estourar ou devolver
 * infinito. Decisão 13.4 rejeita quantidade de projeto zero no cadastro, então
 * isto é defesa em profundidade para dado antigo.
 *
 * Não há teto: acumulado acima do projeto passa de 1, e quem exibe decide o
 * aviso (caso de teste obrigatório 6). A planilha não avisava nada.
 */
export function divideParaPercentual(
  acumulado: Quantidade,
  projeto: Quantidade,
): Decimal | null {
  if (projeto.isZero()) return null;
  return acumulado.dividedBy(projeto);
}

const FORMATADOR_BR = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: ESCALA,
  maximumFractionDigits: ESCALA,
});

/** Separador brasileiro: `15.027,032`. Nunca `15,027.032`. */
export function formataBr(q: Quantidade): string {
  return FORMATADOR_BR.format(q.toNumber());
}

const FORMATADOR_BR_2 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Duas casas, como o bloco 7 do RDO imprime. */
export function formataBrDuasCasas(q: Quantidade): string {
  return FORMATADOR_BR_2.format(q.toNumber());
}

/**
 * Decisão 17.2: valor zero sai como traço, não como `0,00` nem em branco.
 * É o que o formato numérico da célula produz na planilha.
 */
export function formataBrOuTraco(q: Quantidade): string {
  return q.isZero() ? '-' : formataBr(q);
}

export function formataBrDuasCasasOuTraco(q: Quantidade): string {
  return q.isZero() ? '-' : formataBrDuasCasas(q);
}

/** Percentual para exibição: `45,43%`. */
export function formataPercentual(fracao: Decimal | null): string {
  if (fracao === null) return '-';
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fracao.times(100).toNumber())}%`;
}
