/**
 * Consulta do RDO diário, com a borda de erro.
 *
 * Três categorias de erro, tratadas de formas diferentes
 * (`padroes-codigo`, Erro):
 *
 * 1. **entrada** — data inexistente, obra sem identificador: recusada aqui,
 *    com mensagem que diz o que corrigir;
 * 2. **domínio** — data fora do período do contrato, obra não encontrada:
 *    devolvida como resultado, para que quem chama seja obrigado a tratar;
 * 3. **inesperada** — qualquer exceção que suba de uma porta: registrada no log
 *    com identificador de correlação e devolvida como mensagem genérica.
 *
 * A mensagem do caso 3 **não** carrega rastro de pilha nem nome de pessoa, em
 * nenhum ambiente (CLAUDE.md, Segurança; CT-235). O cálculo do efetivo mexe com
 * o cadastro de pessoal: é o lugar mais provável de um nome vazar numa
 * mensagem de erro, e por isso o detalhe técnico fica só no log, ligado pelo
 * identificador que o usuário recebe para citar no suporte.
 */

import { geraId, type CorrelacaoId } from '../../../shared/id';
import { mensagemGenericaDeErro, registra } from '../../../shared/log';
import { type CodigoErro, erro, type Result } from '../../../shared/result';
import { montaRdoDiario } from '../monta-rdo-diario';
import type { PortasDoRdo } from '../portas';
import type { RdoDiario } from '../tipos';
import { interpretaPedidoDeRdo } from './esquemas';

/**
 * `shared/result` ainda não tem código para falha inesperada, e acrescentá-lo
 * é mudança em `src/shared/**`, que exige perguntar. Enquanto isso, o código
 * vive aqui, ao lado de quem o produz.
 */
export const FALHA_INESPERADA = 'FALHA_INESPERADA';

export interface ErroDeConsultaDoRdo {
  readonly tipo: 'dominio' | 'entrada' | 'inesperado';
  readonly codigo: CodigoErro | typeof FALHA_INESPERADA;
  readonly mensagem: string;
}

export async function consultaRdoDiario(
  bruto: unknown,
  portas: PortasDoRdo,
): Promise<Result<RdoDiario, ErroDeConsultaDoRdo>> {
  const pedido = interpretaPedidoDeRdo(bruto);
  if (!pedido.ok) return erro(pedido.erro);

  try {
    const montado = await montaRdoDiario(pedido.valor.obraId, pedido.valor.dia, portas);
    if (!montado.ok) return erro(montado.erro);
    return montado;
  } catch (causa) {
    const correlacaoId: CorrelacaoId = geraId();
    // O contexto de log só aceita identificador: `ContextoDeLog` não tem campo
    // de texto livre, então nome de pessoa não entra nem por descuido.
    //
    // A exceção NÃO é engolida: ela vira este evento, com o identificador que o
    // usuário recebe. O que não é copiado para o log é a mensagem da causa, de
    // propósito: um erro de driver costuma citar o valor da linha, e a linha
    // pode ser o cadastro de pessoal (docs/arquitetura/v1.md, 5.4).
    //
    // `registra(..., { causa })` nem compilaria: o campo não existe no tipo.
    registra(
      'erro',
      correlacaoId,
      causa instanceof Error
        ? `rdo.montagem_falhou.${causa.name}`
        : 'rdo.montagem_falhou',
      { obraId: pedido.valor.obraId, dia: pedido.valor.dia },
    );
    return erro({
      tipo: 'inesperado',
      codigo: FALHA_INESPERADA,
      mensagem: mensagemGenericaDeErro(correlacaoId),
    });
  }
}
