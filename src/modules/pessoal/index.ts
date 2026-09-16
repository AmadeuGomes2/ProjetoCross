/**
 * Porta pública do módulo `pessoal`.
 *
 * `listaMobilizacao` é o que a frente C consome para o bloco 5 do RDO: as
 * **passagens cruas**, sem nome. Quem agrega o efetivo é `rdo/efetivo.ts`, e
 * só ele — este módulo não conta ninguém. `PessoaMobilizada` não tem campo de
 * nome: o vazamento é impossível pelo tipo.
 */

export {
  cadastraPessoa,
  encerraPassagem,
  listaMobilizacao,
  listaPessoalDaObra,
  registraPassagem,
} from './casos-de-uso';

export { analisaCadastrarPessoa, analisaPassagem } from './borda/esquemas';

export type {
  Ambiente,
  AtorDePessoal,
  ComandoCadastrarPessoa,
  ComandoEncerrarPassagem,
  ComandoPassagem,
  Passagem,
  PassagemMobilizada,
  PessoaComPassagens,
  PessoaMobilizada,
  ResolveFuncao,
} from './tipos';
