/**
 * Raiz de composição do módulo `lancamento`.
 *
 * Arquitetura 4.1: "a ligação acontece na raiz de composição, um arquivo por
 * caso de uso. É o único lugar que importa de mais de um módulo." Este arquivo
 * é o da frente B; as outras frentes criam os seus e ninguém edita o do outro.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PENDENTE DA FRENTE A. As quatro portas abaixo estão declaradas em
 * `src/modules/lancamento/portas.ts` e ainda não têm dono:
 *
 *   exigeAcessoNaObra  → `src/modules/acesso`   (o embrulho `comAtorNaObra`)
 *   autenticaRequisicao→ `src/modules/acesso`
 *   periodoDaObra      → `src/modules/obra`     (`obtemCabecalhoDaObra`)
 *   status / serviços  → `src/modules/taxonomia` e `src/modules/obra`
 *
 * Enquanto isso, elas **recusam** em vez de fingir que funcionam: a tela diz o
 * que fazer e o rascunho local continua guardando o que foi digitado. Trocar
 * cada uma é uma linha; nenhum caso de uso muda.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { obtemConexao } from '../../db';
import { criaCasosDeLancamento, type CasosDeLancamento } from '../../modules/lancamento';
import type { PortasDoLancamento } from '../../modules/lancamento';
import type { Ator } from '../../modules/lancamento';
import { criaRepositorioDrizzle } from '../../modules/lancamento/repositorio-drizzle';
import {
  CODIGO_ERRO,
  erro,
  erroDeAcesso,
  type ErroDeAcesso,
  type Result,
} from '../../shared/result';
import { SUGESTOES_MOTIVO_PARADA } from '../../shared/taxonomia';

const RECUSA_ENQUANTO_A_NAO_ENTREGA = erroDeAcesso(
  CODIGO_ERRO.SEM_PERMISSAO,
  'O controle de acesso à obra ainda não está ligado. O que você digitou fica salvo no aparelho e será enviado depois.',
);

export const portasPendentesDaFrenteA: PortasDoLancamento = {
  exigeAcessoNaObra: () => Promise.resolve(erro(RECUSA_ENQUANTO_A_NAO_ENTREGA)),
  periodoDaObra: () => Promise.resolve(null),
  status: {
    porId: () => Promise.resolve(null),
    porTermo: () => Promise.resolve(null),
    ativos: () => Promise.resolve([]),
  },
  servicos: {
    porId: () => Promise.resolve(null),
    porNome: () => Promise.resolve(null),
    daObra: () => Promise.resolve([]),
  },
  // Esta é a única que já pode responder de verdade: a carga inicial das oito
  // sugestões mora em `shared/taxonomia` e não depende de banco.
  sugestoesDeMotivo: () => Promise.resolve([...SUGESTOES_MOTIVO_PARADA]),
};

/** As portas em uso hoje. Trocar aqui é o que liga a frente A ao módulo. */
export function portasDeLancamento(): PortasDoLancamento {
  return portasPendentesDaFrenteA;
}

export function casosDeLancamento(
  portas: PortasDoLancamento = portasPendentesDaFrenteA,
): CasosDeLancamento {
  return criaCasosDeLancamento({
    repositorio: criaRepositorioDrizzle(obtemConexao()),
    portas,
    relogio: () => new Date(),
  });
}

/**
 * Quem é o autor da requisição.
 *
 * PENDENTE: vira `autenticaRequisicao(cookie)` do módulo `acesso`. Até lá
 * recusa, porque inventar um ator seria exatamente o furo que a seção 5.2 da
 * arquitetura existe para impedir.
 */
export function atorDaRequisicao(): Promise<Result<Ator, ErroDeAcesso>> {
  return Promise.resolve(erro(RECUSA_ENQUANTO_A_NAO_ENTREGA));
}
