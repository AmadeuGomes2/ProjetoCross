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

import { criaDiaPuro, diferencaEmDias, type DiaPuro } from '../../../shared/date/dia';
import { ordemDasDatasEstaInvertida } from '../../../shared/date/intervalo';
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

/**
 * Teto da consulta de período: **366 dias**, a duração do contrato.
 *
 * Decisão 35.1, de 16/09/2026. O número não é redondo por acaso: o contrato
 * `P0476/01-25 - BLOCO 02` vai de 05/02/2026 a 05/02/2027, que são 366 dias
 * contados como manda `regras-extraidas` §8 (`final − inicial + 1`). Um teto
 * menor recusaria a própria obra; sem teto nenhum, uma requisição pede dez
 * anos de uma vez, e esse é o jeito mais barato de derrubar o servidor de
 * dentro — com sessão válida e sem senha de ninguém.
 */
export const DIAS_MAXIMOS_DA_CONSULTA = 366;

export interface PedidoDePeriodoDoRdo {
  readonly obraId: ObraId;
  readonly dataInicial: DiaPuro;
  readonly dataFinal: DiaPuro;
}

const esquemaDoPeriodo = z.object({
  obraId: z.string().trim().min(1).max(TAMANHO_MAXIMO_DO_ID),
  dataInicial: z.string().trim().min(1).max(10),
  dataFinal: z.string().trim().min(1).max(10),
});

/**
 * A borda de toda consulta do RDO que cobre mais de um dia.
 *
 * As três recusas, na ordem em que a pessoa as corrige: dia que o calendário
 * não tem, ordem das datas invertida e período longo demais. A contagem é a
 * mesma do período de BMS, e é a do documento: início e fim entram.
 */
export function interpretaPedidoDePeriodo(
  bruto: unknown,
): Result<PedidoDePeriodoDoRdo, ErroDeEntrada> {
  const lido = esquemaDoPeriodo.safeParse(bruto);
  if (!lido.success) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.DIA_INVALIDO,
        'Informe a obra e as datas inicial e final do período.',
      ),
    );
  }

  const dataInicial = criaDiaPuro(lido.data.dataInicial);
  if (!dataInicial.ok) {
    return erro(
      erroDeEntrada(dataInicial.erro.codigo, dataInicial.erro.mensagem, 'dataInicial'),
    );
  }

  const dataFinal = criaDiaPuro(lido.data.dataFinal);
  if (!dataFinal.ok) {
    return erro(
      erroDeEntrada(dataFinal.erro.codigo, dataFinal.erro.mensagem, 'dataFinal'),
    );
  }

  // A comparação é a de `shared/date/intervalo`, a mesma que `obra`,
  // `pessoal` e `equipamento` usam. Reescrevê-la aqui seria a quarta cópia.
  if (ordemDasDatasEstaInvertida({ inicio: dataInicial.valor, fim: dataFinal.valor })) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL,
        'A data final não pode ser anterior à inicial.',
        'dataFinal',
      ),
    );
  }

  const dias = diferencaEmDias(dataInicial.valor, dataFinal.valor) + 1;
  if (dias > DIAS_MAXIMOS_DA_CONSULTA) {
    return erro(
      erroDeEntrada(
        // O número está certo; o pedido é que é grande demais. A distinção
        // importa porque este é o caminho mais barato de derrubar o servidor
        // de dentro, com sessão válida, e quem lê o log precisa reconhecê-lo
        // de longe em vez de confundir com erro de digitação.
        CODIGO_ERRO.PERIODO_LONGO_DEMAIS,
        `A consulta cobre no máximo ${DIAS_MAXIMOS_DA_CONSULTA} dias, que é a duração do contrato. Este período tem ${dias}. Escolha um intervalo menor.`,
        'dataFinal',
      ),
    );
  }

  return ok({
    obraId: idConfiavel<'obra'>(lido.data.obraId),
    dataInicial: dataInicial.valor,
    dataFinal: dataFinal.valor,
  });
}
