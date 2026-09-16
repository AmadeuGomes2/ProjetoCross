/**
 * Porta pública do módulo `acesso`.
 *
 * É o que as frentes B e C consomem. Elas **declaram** a porta de que precisam
 * (um tipo de função) e a tipagem estrutural confere; não importam este
 * arquivo de dentro de um módulo (docs/arquitetura/v1.md, 4.1). A ligação
 * acontece em `src/app/_composicao/`.
 */

export type {
  Ambiente,
  Ator,
  AtorNaObra,
  ObraResumo,
  Perfil,
  PortadorDeAcesso,
} from './tipos';
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

/**
 * A conta que nasce fora da web, pelo comando de instalação (decisão 25.1).
 * Quem a consome é `src/db/criar-engenheiro.ts`, que é raiz de composição da
 * linha de comando — não há caminho HTTP para esta função, e é o ponto dela.
 */
export {
  criaContaDeEngenheiroDeInstalacao,
  SENHA_MINIMA_DE_CARACTERES,
  type ComandoCriarEngenheiro,
  type ContaDeInstalacao,
  type SituacaoDaInstalacao,
} from './instalacao';

export {
  comAtorNaObra,
  exigeAcessoNaObra,
  exigePermissaoParaCriarObra,
  type ContextoDeRota,
  type ManipuladorProtegido,
  type ParametrosDeRota,
} from './autorizacao';

export {
  aceitaConvite,
  aceitaConviteEEntra,
  geraConvite,
  listaAcessosDaObra,
  listaObrasDoUsuario,
  perfilDeConvite,
  revogaAcesso,
  DIAS_DE_VALIDADE_DO_CONVITE,
  type ConviteGerado,
} from './convite';

/** Uma linha da tela de acesso: id, usuário, perfil. **Sem nome e sem e-mail.** */
export type { LinhaDeAcessoDaObra as AcessoDaObra } from './repositorio';

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
