'use server';

/**
 * Server Actions do lançamento.
 *
 * É aqui que a entrada do navegador atravessa a fronteira, e por isso:
 *
 * - tudo chega como `unknown` e passa pelo Zod da borda (`recebe*`);
 * - o ator vem do servidor, nunca do formulário — quem envia não escolhe quem é;
 * - a resposta devolvida à tela tem mensagem em português e NUNCA rastro de
 *   pilha (CLAUDE.md, Segurança);
 * - o log recebe só identificador: `registra` não aceita texto livre, e a
 *   descrição da atividade, o motivo da parada e a observação podem conter nome
 *   de trabalhador ou de fiscal.
 */

import type { Ator, CasosDeLancamento } from '../../modules/lancamento';
import { geraId } from '../../shared/id';
import { mensagemGenericaDeErro, registra } from '../../shared/log';
import type { ErroConhecido, Result } from '../../shared/result';
import { atorDaRequisicao, casosDeLancamento } from '../_composicao/lancamento';

export interface RespostaDaAcao {
  readonly ok: boolean;
  readonly mensagem: string;
  readonly avisos: readonly string[];
  /** Campo do formulário a destacar. Nunca o valor digitado. */
  readonly campo: string | null;
}

function recusa(e: ErroConhecido): RespostaDaAcao {
  return {
    ok: false,
    mensagem: e.mensagem,
    avisos: [],
    campo: e.tipo === 'entrada' ? (e.campo ?? null) : null,
  };
}

async function despacha<T>(
  evento: string,
  operacao: (casos: CasosDeLancamento, ator: Ator) => Promise<Result<T, ErroConhecido>>,
  avisosDe: (valor: T) => readonly string[] = () => [],
): Promise<RespostaDaAcao> {
  const correlacaoId = geraId<'correlacao'>();
  const ator = await atorDaRequisicao();
  if (!ator.ok) {
    registra('aviso', correlacaoId, evento, { codigo: ator.erro.codigo });
    return recusa(ator.erro);
  }
  try {
    const resultado = await operacao(casosDeLancamento(), ator.valor);
    if (!resultado.ok) {
      registra('aviso', correlacaoId, evento, {
        codigo: resultado.erro.codigo,
        usuarioId: ator.valor.usuarioId,
      });
      return recusa(resultado.erro);
    }
    registra('info', correlacaoId, evento, { usuarioId: ator.valor.usuarioId });
    return { ok: true, mensagem: '', avisos: avisosDe(resultado.valor), campo: null };
  } catch {
    // Erro inesperado: o detalhe fica no log do servidor, ligado pelo
    // identificador de correlação. O usuário recebe mensagem genérica, sem
    // rastro de pilha, em qualquer ambiente.
    registra('erro', correlacaoId, `${evento}.inesperado`, {
      usuarioId: ator.valor.usuarioId,
    });
    return {
      ok: false,
      mensagem: mensagemGenericaDeErro(correlacaoId),
      avisos: [],
      campo: null,
    };
  }
}

export async function confirmaODia(bruto: unknown): Promise<RespostaDaAcao> {
  return despacha('lancamento.dia.confirmado', (casos, ator) =>
    casos.recebeConfirmacaoDoDia(bruto, ator),
  );
}

export async function lancaAtividade(bruto: unknown): Promise<RespostaDaAcao> {
  return despacha('lancamento.atividade.criada', (casos, ator) =>
    casos.recebeAtividade(bruto, ator),
  );
}

export async function lancaProducao(bruto: unknown): Promise<RespostaDaAcao> {
  return despacha(
    'lancamento.producao.criada',
    (casos, ator) => casos.recebeProducao(bruto, ator),
    // Produção em dia parado, em dia sem atividade ou acima do projeto é aceita
    // e AVISADA (12.1 e caso obrigatório 6). O aviso sobe para a tela.
    (aceito) => aceito.avisos.map((a) => a.mensagem),
  );
}

export async function lancaPluviometria(bruto: unknown): Promise<RespostaDaAcao> {
  return despacha('lancamento.pluviometria.criada', (casos, ator) =>
    casos.recebePluviometria(bruto, ator),
  );
}

export async function lancaObservacao(bruto: unknown): Promise<RespostaDaAcao> {
  return despacha('lancamento.observacao.criada', (casos, ator) =>
    casos.recebeObservacao(bruto, ator),
  );
}

export async function fechaODia(bruto: unknown): Promise<RespostaDaAcao> {
  return despacha('lancamento.dia.fechado', (casos, ator) =>
    casos.recebeFechamento(bruto, ator),
  );
}
