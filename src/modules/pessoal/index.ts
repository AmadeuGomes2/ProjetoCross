/**
 * Porta pública do módulo `pessoal`.
 *
 * `contaEfetivoPorFuncao` é o que a frente C consome para o bloco 5 do RDO.
 * `EfetivoPorFuncao` não tem campo de nome: o vazamento é impossível pelo
 * tipo.
 */

export {
  cadastraPessoa,
  contaEfetivoPorFuncao,
  encerraPassagem,
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
  EfetivoPorFuncao,
  Passagem,
  PessoaComPassagens,
  ResolveFuncao,
} from './tipos';
