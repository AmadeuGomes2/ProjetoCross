/**
 * Consulta do RDO de período, com a borda de erro.
 *
 * As mesmas três categorias de `./consulta-rdo.ts`:
 *
 * 1. **entrada** — dia que o calendário não tem, conjunto vazio, conjunto acima
 *    do teto: recusada na borda, com mensagem que diz o que corrigir;
 * 2. **domínio** — dia fora do período do contrato, obra não encontrada:
 *    devolvida como resultado, para que quem chama seja obrigado a tratar;
 * 3. **inesperada** — exceção que suba de uma porta: registrada no log com
 *    identificador de correlação e devolvida como mensagem genérica.
 *
 * A mensagem do caso 3 **não** carrega rastro de pilha nem nome de pessoa, em
 * nenhum ambiente. O cálculo do consolidado mexe com o cadastro de pessoal, que
 * é o lugar mais provável de um nome vazar numa mensagem de erro.
 *
 * **A lista de dias não vai para o log.** `ContextoDeLog` só aceita
 * identificador e contagem, e o que se registra aqui é `quantidade`: 366 datas
 * num evento de log é ruído que ninguém lê e volume que alguém paga.
 */

import { geraId, type CorrelacaoId } from '../../../shared/id';
import { mensagemGenericaDeErro, registra } from '../../../shared/log';
import { type CodigoErro, erro, type Result } from '../../../shared/result';
import { montaRdoDePeriodo } from '../periodo/monta-rdo-de-periodo';
import type { PortasDoRdoDePeriodo } from '../periodo/portas';
import type { RdoDePeriodo } from '../periodo/tipos';
import { FALHA_INESPERADA } from './consulta-rdo';
import { interpretaPedidoDeRdoDePeriodo } from './esquemas-de-periodo';

export interface ErroDeConsultaDoPeriodo {
  readonly tipo: 'dominio' | 'entrada' | 'inesperado';
  readonly codigo: CodigoErro | typeof FALHA_INESPERADA;
  readonly mensagem: string;
}

export async function consultaRdoDePeriodo(
  bruto: unknown,
  portas: PortasDoRdoDePeriodo,
): Promise<Result<RdoDePeriodo, ErroDeConsultaDoPeriodo>> {
  const pedido = interpretaPedidoDeRdoDePeriodo(bruto);
  if (!pedido.ok) return erro(pedido.erro);

  try {
    const montado = await montaRdoDePeriodo(
      pedido.valor.obraId,
      pedido.valor.dias,
      portas,
    );
    if (!montado.ok) return erro(montado.erro);
    return montado;
  } catch (causa) {
    const correlacaoId: CorrelacaoId = geraId();
    // A exceção NÃO é engolida: vira este evento, com o identificador que o
    // usuário recebe. A mensagem da causa não é copiada, de propósito — um erro
    // de driver costuma citar o valor da linha, e a linha pode ser o cadastro
    // de pessoal.
    registra(
      'erro',
      correlacaoId,
      causa instanceof Error
        ? `rdo.periodo.montagem_falhou.${causa.name}`
        : 'rdo.periodo.montagem_falhou',
      { obraId: pedido.valor.obraId, quantidade: pedido.valor.dias.length },
    );
    return erro({
      tipo: 'inesperado',
      codigo: FALHA_INESPERADA,
      mensagem: mensagemGenericaDeErro(correlacaoId),
    });
  }
}
