/**
 * Quem é o portador desta requisição — e nada além disso.
 *
 * O cookie é lido a cada requisição e o perfil **nunca** vem dele: a
 * verificação de perfil é sempre `exigeAcessoNaObra` contra a tabela `acesso`
 * (docs/arquitetura/v1.md, 5.2). Guardar perfil no cookie faria a revogação
 * valer só no próximo login, e o CT-081 exige que valha na requisição seguinte.
 *
 * Duas formas do mesmo portador, porque as duas superfícies pedem coisas
 * diferentes:
 *
 * - a **página** do App Router lê o cookie por `next/headers`;
 * - o **manipulador de rota** lê o cabeçalho da própria `Request`, e por isso
 *   não depende do runtime do Next — é o que permite exercitar a rota do PDF
 *   num teste de integração de verdade.
 */

import { cookies } from 'next/headers';

import {
  autenticaRequisicao,
  encerraSessao,
  leCookie,
  NOME_DO_COOKIE_DE_SESSAO,
  type Ator,
  type AtributosDoCookie,
} from '../../modules/acesso';
import type { ErroDeAcesso, Result } from '../../shared/result';
import { ambienteDaComposicao, type AmbienteDaComposicao } from './ambiente';
import { paraAcesso } from './ambiente-de-cadastro';

export async function atorDaRequisicaoOuRecusa(): Promise<Result<Ator, ErroDeAcesso>> {
  const bolsa = await cookies();
  return autenticaRequisicao(
    bolsa.get(NOME_DO_COOKIE_DE_SESSAO)?.value,
    paraAcesso(ambienteDaComposicao().cadastro),
  );
}

export async function atorDaRequisicao(): Promise<Ator | null> {
  const ator = await atorDaRequisicaoOuRecusa();
  return ator.ok ? ator.valor : null;
}

/** O portador de uma rota. Lê o cabeçalho, não o runtime do Next. */
export function atorDaRota(
  requisicao: Request,
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): Promise<Result<Ator, ErroDeAcesso>> {
  return autenticaRequisicao(
    leCookie(requisicao, NOME_DO_COOKIE_DE_SESSAO),
    paraAcesso(ambiente.cadastro),
  );
}

export async function gravaCookieDeSessao(
  token: string,
  atributos: AtributosDoCookie,
): Promise<void> {
  const bolsa = await cookies();
  bolsa.set(NOME_DO_COOKIE_DE_SESSAO, token, atributos);
}

export async function apagaCookieDeSessao(): Promise<void> {
  const bolsa = await cookies();
  const valor = bolsa.get(NOME_DO_COOKIE_DE_SESSAO)?.value;
  // Invalida no servidor antes de apagar no navegador: apagar só o cookie
  // deixaria a sessão viva para quem tivesse copiado o valor. O `await` é a
  // ordem: sem ele a sessão seria encerrada depois da resposta sair, ou nunca.
  await encerraSessao(valor, paraAcesso(ambienteDaComposicao().cadastro));
  bolsa.delete(NOME_DO_COOKIE_DE_SESSAO);
}
