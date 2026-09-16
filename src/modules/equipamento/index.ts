/**
 * Porta pública do módulo `equipamento`.
 *
 * `listaMobilizacao` é o que a frente C consome para o bloco 6: as passagens
 * cruas, por identificador. Quem agrega o efetivo é `rdo/efetivo.ts`, e só ele.
 */

export {
  cadastraEquipamento,
  encerraPassagem,
  listaEquipamentosDaObra,
  listaMobilizacao,
  registraPassagem,
} from './casos-de-uso';

export {
  analisaCadastrarEquipamento,
  analisaPassagemDeEquipamento,
} from './borda/esquemas';

export type {
  Ambiente,
  AtorDeEquipamento,
  ComandoCadastrarEquipamento,
  ComandoEncerrarPassagemDeEquipamento,
  ComandoPassagemDeEquipamento,
  EquipamentoComPassagens,
  EquipamentoMobilizado,
  PassagemDeEquipamento,
  PassagemMobilizada,
  ResolveTipoEquipamento,
} from './tipos';
