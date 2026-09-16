/**
 * A borda do RDO: onde a entrada vinda do navegador deixa de ser hostil.
 *
 * `docs/arquitetura/v1.md`, 5.1: a validação por esquema acontece antes de
 * qualquer caso de uso, com `safeParse` e nunca `parse` — falha de entrada é
 * `Result`, não exceção. O esquema **não devolve `string`**: ele transforma
 * para os tipos de marca de `shared`, e por isso esquecer a validação não
 * compila.
 *
 * O caso obrigatório 10 mora aqui: `2026-09-31` é recusado porque
 * `criaDiaPuro` valida contra o calendário real. A aba `31` da planilha tem
 * área de impressão e imprime um RDO de 01/10/2026 com todos os blocos
 * preenchidos; esse documento não pode voltar a existir.
 *
 * O identificador da obra é conferido quanto à forma, e **não** quanto à
 * existência: quem responde se a obra existe e se este usuário a enxerga é
 * `exigeAcessoNaObra`, na frente A, que devolve o mesmo erro para obra
 * inexistente e obra sem acesso, para não revelar existência.
 */

import { z } from 'zod';

import { criaDiaPuro, type DiaPuro } from '../../../shared/date/dia';
import { idConfiavel, type ObraId } from '../../../shared/id';
import {
  CODIGO_ERRO,
  erro,
  erroDeEntrada,
  type ErroDeEntrada,
  ok,
  type Result,
} from '../../../shared/result';

const TAMANHO_MAXIMO_DO_ID = 64;

const esquemaDoPedido = z.object({
  obraId: z.string().trim().min(1).max(TAMANHO_MAXIMO_DO_ID),
  dia: z.string().trim().min(1).max(10),
});

export interface PedidoDeRdo {
  readonly obraId: ObraId;
  readonly dia: DiaPuro;
}

export function interpretaPedidoDeRdo(
  bruto: unknown,
): Result<PedidoDeRdo, ErroDeEntrada> {
  const lido = esquemaDoPedido.safeParse(bruto);
  if (!lido.success) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.DIA_INVALIDO,
        'Informe a obra e a data do RDO que você quer abrir.',
      ),
    );
  }

  const dia = criaDiaPuro(lido.data.dia);
  if (!dia.ok) return dia;

  return ok({ obraId: idConfiavel<'obra'>(lido.data.obraId), dia: dia.valor });
}
