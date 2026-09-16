/**
 * Porta pública do módulo `pessoal`.
 *
 * `listaMobilizacao` é o que a frente C consome para o bloco 5 do RDO: as
 * **passagens cruas**, sem nome. Quem agrega o efetivo é `rdo/efetivo.ts`, e
 * só ele — este módulo não conta ninguém. `PessoaMobilizada` não tem campo de
 * nome: o vazamento é impossível pelo tipo.
 *
 * Cada passagem carrega a **sua** função (decisão 29.1). `trocaFuncao` é o
 * único caminho de troca, e ele encerra uma passagem e abre outra.
 */

export {
  cadastraPessoa,
  encerraPassagem,
  listaMobilizacao,
  listaPessoalDaObra,
  registraPassagem,
  trocaFuncao,
} from './casos-de-uso';

export {
  analisaCadastrarPessoa,
  analisaPassagem,
  analisaTrocarFuncao,
} from './borda/esquemas';

export type {
  Ambiente,
  AtorDePessoal,
  ComandoCadastrarPessoa,
  ComandoEncerrarPassagem,
  ComandoPassagem,
  ComandoTrocarFuncao,
  Passagem,
  PassagemMobilizada,
  PessoaComPassagens,
  PessoaMobilizada,
  ResolveFuncao,
} from './tipos';
