/**
 * Conversões de campo de formulário para tipo de domínio.
 *
 * docs/arquitetura/v1.md, 5.1: **o esquema não devolve `string`** — ele
 * transforma para os tipos de marca de `shared`. Consequência: a assinatura do
 * caso de uso não aceita entrada crua, e esquecer a validação não compila.
 *
 * `campo` viaja no erro para a interface destacar o que corrigir. O **valor
 * digitado nunca** viaja: pode conter nome de pessoa (CLAUDE.md, Segurança).
 *
 * Este arquivo se repete, menor, em `pessoal` e `equipamento`. `src/shared/`
 * está fora do alcance desta frente; está no relatório de entrega como
 * candidato a subir.
 */

import { criaDiaPuro, type DiaPuro } from '../../../shared/date/dia';
import {
  CODIGO_ERRO,
  erro,
  erroDeEntrada,
  ok,
  type ErroDeEntrada,
  type Result,
} from '../../../shared/result';

/** Teto de sanidade para todo texto livre que chega do navegador (R23). */
export const MAXIMO_DE_TEXTO = 300;

export function exigeTexto(
  bruto: unknown,
  campo: string,
  rotulo: string,
  maximo: number = MAXIMO_DE_TEXTO,
): Result<string, ErroDeEntrada> {
  if (typeof bruto !== 'string' || bruto.trim() === '') {
    return erro(erroDeEntrada(CODIGO_ERRO.TERMO_VAZIO, `Informe ${rotulo}.`, campo));
  }
  const texto = bruto.trim();
  if (texto.length > maximo) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.TERMO_VAZIO,
        `O campo ${rotulo} passa de ${maximo} caracteres.`,
        campo,
      ),
    );
  }
  return ok(texto);
}

/**
 * Dia de obra.
 *
 * `criaDiaPuro` valida contra o calendário real: 29/02/2026 e 31/09 são
 * recusados (CT-010, CT-011). A planilha encadeia dia+1 e chega a 31 de
 * setembro, que ela imprime como 1.º de outubro; data inexistente nunca pode
 * virar outro dia em silêncio.
 */
export function exigeDia(bruto: unknown, campo: string): Result<DiaPuro, ErroDeEntrada> {
  if (typeof bruto !== 'string' || bruto.trim() === '') {
    return erro(erroDeEntrada(CODIGO_ERRO.DIA_INVALIDO, 'Informe a data.', campo));
  }
  const dia = criaDiaPuro(bruto.trim());
  if (!dia.ok) {
    return erro(erroDeEntrada(dia.erro.codigo, dia.erro.mensagem, campo));
  }
  return ok(dia.valor);
}

export function exigeInteiroNaoNegativo(
  bruto: unknown,
  campo: string,
  rotulo: string,
): Result<number, ErroDeEntrada> {
  const numero = typeof bruto === 'number' ? bruto : Number(String(bruto).trim());
  if (!Number.isInteger(numero) || numero < 0) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.TERMO_VAZIO,
        `O campo ${rotulo} precisa ser um número inteiro não negativo.`,
        campo,
      ),
    );
  }
  return ok(numero);
}
