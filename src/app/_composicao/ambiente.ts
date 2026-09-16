/**
 * O ambiente da raiz de composição: a conexão e o relógio, num lugar só.
 *
 * `ambiente-de-cadastro.ts` já entrega o `{ db, relogio }` que os módulos de
 * cadastro pedem. Falta uma peça: o módulo `lancamento` precisa da `ConexaoRdo`
 * inteira, porque o repositório dele usa transação do driver. Em vez de duas
 * verdades sobre qual banco está aberto, este arquivo devolve as duas formas do
 * **mesmo** ambiente.
 *
 * ## Por que existe o desvio de teste
 *
 * Um manipulador de rota do App Router não recebe dependência por argumento:
 * `export const GET = ...` é o contrato do framework. Sem um ponto de troca, a
 * rota do PDF só poderia ser exercitada contra o banco em disco do processo —
 * ou seja, não poderia ser exercitada, e voltaríamos ao estado em que "o PDF só
 * existe dentro do teste do módulo".
 *
 * O desvio segue o precedente de `src/shared/log/index.ts`, que já expõe
 * `defineEscritor`/`restauraEscritorPadrao` pela mesma razão. Regras que o
 * mantêm honesto:
 *
 * - `defineAmbienteParaTeste` **não muda comportamento nenhum**: troca o banco,
 *   não a autorização, não o cálculo, não o documento;
 * - quem o chama restaura no `afterEach`;
 * - em produção nada o chama, e `ambienteDaComposicao()` abre a conexão do
 *   processo como antes.
 */

import { obtemConexao, type ConexaoRdo } from '../../db';
import type { AmbienteDeCadastro } from './ambiente-de-cadastro';

export interface AmbienteDaComposicao {
  readonly conexao: ConexaoRdo;
  /** A mesma conexão, na forma que os módulos de cadastro pedem. */
  readonly cadastro: AmbienteDeCadastro;
}

export function criaAmbienteDaComposicao(
  conexao: ConexaoRdo,
  relogio: () => Date = () => new Date(),
): AmbienteDaComposicao {
  return { conexao, cadastro: { db: conexao.db, relogio } };
}

let ambienteAtual: AmbienteDaComposicao | null = null;

/**
 * O ambiente em uso. Preguiçoso de propósito: abrir o banco no topo do módulo
 * faria `import` ter efeito colateral.
 */
export function ambienteDaComposicao(): AmbienteDaComposicao {
  ambienteAtual ??= criaAmbienteDaComposicao(obtemConexao());
  return ambienteAtual;
}

export function defineAmbienteParaTeste(ambiente: AmbienteDaComposicao): void {
  ambienteAtual = ambiente;
}

export function restauraAmbientePadrao(): void {
  ambienteAtual = null;
}
