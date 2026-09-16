/**
 * Porta pública do módulo `equipamento`.
 *
 * `contaEfetivoPorIdentificador` é o que a frente C consome para o bloco 6.
 */

export {
  cadastraEquipamento,
  contaEfetivoPorIdentificador,
  encerraPassagem,
  listaEquipamentosDaObra,
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
  EfetivoPorIdentificador,
  EquipamentoComPassagens,
  PassagemDeEquipamento,
  ResolveTipoEquipamento,
} from './tipos';
