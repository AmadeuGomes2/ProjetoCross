/**
 * Sessão do lado do servidor, para as telas de cadastro.
 *
 * O cookie é lido a cada requisição e o perfil **nunca** vem dele: a
 * verificação é sempre `exigeAcessoNaObra` contra a tabela `acesso`
 * (docs/arquitetura/v1.md, 5.2). Este arquivo só responde "quem é o portador".
 */

import { cookies } from 'next/headers';

import {
  autenticaRequisicao,
  encerraSessao,
  NOME_DO_COOKIE_DE_SESSAO,
  type AtributosDoCookie,
  type Ator,
} from '../../modules/acesso';
import {
  ambienteDeCadastroPadrao,
  paraAcesso,
} from '../_composicao/ambiente-de-cadastro';

export async function atorDaRequisicao(): Promise<Ator | null> {
  const bolsa = await cookies();
  const valor = bolsa.get(NOME_DO_COOKIE_DE_SESSAO)?.value;
  const ator = autenticaRequisicao(valor, paraAcesso(ambienteDeCadastroPadrao()));
  return ator.ok ? ator.valor : null;
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
  // deixaria a sessão viva para quem tivesse copiado o valor.
  encerraSessao(valor, paraAcesso(ambienteDeCadastroPadrao()));
  bolsa.delete(NOME_DO_COOKIE_DE_SESSAO);
}
