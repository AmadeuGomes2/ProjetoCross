/**
 * Porta pública do módulo `acesso`.
 *
 * É o que as frentes B e C consomem. Elas **declaram** a porta de que precisam
 * (um tipo de função) e a tipagem estrutural confere; não importam este
 * arquivo de dentro de um módulo (docs/arquitetura/v1.md, 4.1). A ligação
 * acontece em `src/app/_composicao/`.
 */

export type { Ambiente, Ator, AtorNaObra, ObraResumo, Perfil } from './tipos';
export { perfilAtende } from './tipos';

export {
  autenticaRequisicao,
  abreSessao,
  encerraSessao,
  iniciaSessaoComSenha,
  registraUsuario,
  HORAS_DE_SESSAO,
  type ComandoRegistrarUsuario,
  type SessaoAberta,
} from './autenticacao';

export {
  comAtorNaObra,
  exigeAcessoNaObra,
  exigePermissaoParaCriarObra,
  type ContextoDeRota,
  type ManipuladorProtegido,
} from './autorizacao';

export {
  aceitaConvite,
  aceitaConviteEEntra,
  geraConvite,
  listaAcessosDaObra,
  listaObrasDoUsuario,
  revogaAcesso,
  DIAS_DE_VALIDADE_DO_CONVITE,
  type ConviteGerado,
} from './convite';

export {
  atributosDoCookie,
  leCookie,
  NOME_DO_COOKIE_DE_SESSAO,
  type AtributosDoCookie,
} from './token';

export { geraHashDeSenha, verificaSenha } from './senha';

/**
 * Concessão de acesso usada pela criação da obra.
 *
 * `obra` não pode importar `acesso` (módulo não importa de módulo). Ela declara
 * a porta `ConcedeAcessoDeEngenheiro` e `src/app/_composicao/` liga esta função
 * ali. A assinatura recebe o banco porque a gravação precisa acontecer **na
 * mesma transação** da obra: senão a obra nasce sem dono, e o criador não
 * consegue nem cadastrar nem liberar ninguém (CT-003).
 */
export { concedeAcessoDeEngenheiro } from './concessao';
