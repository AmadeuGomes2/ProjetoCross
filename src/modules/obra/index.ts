/** Porta pública do módulo `obra`. Ver `src/app/_composicao/`. */

export {
  criaObra,
  defineResponsavelTecnico,
  editaCadastroDaObra,
  obtemCabecalhoDaObra,
} from './cria-obra';

export {
  atualizaPeriodoBms,
  cadastraPeriodoBms,
  excluiPeriodoBms,
  diasDoPeriodo,
  listaPeriodosBms,
  resolveBmsDoDia,
  validaConjuntoDePeriodos,
  validaIntervalo,
  type ComandoPeriodoBms,
} from './periodo-bms';

export {
  cadastraServicoControlado,
  defineQuantidadeDeProjeto,
  listaHistoricoDeQuantidade,
  listaServicosControlados,
  type ComandoQuantidadeProjeto,
  type ComandoServico,
} from './servico-controlado';

export {
  defineLogoDaObra,
  identificaImagem,
  obtemLogoDaObra,
  removeLogoDaObra,
  limpaMetadados,
  LIMITE_DA_LOGO_EM_BYTES,
  LIMITE_DA_LOGO_EM_KB,
  TIPOS_DE_IMAGEM,
  type ComandoDefinirLogo,
  type LogoDaObra,
  type TipoDeImagem,
} from './logo';

export {
  analisaCriarObra,
  analisaEditarObra,
  analisaPeriodoBms,
  analisaQuantidadeDeProjeto,
  analisaResponsavelTecnico,
} from './borda/esquemas';

export type {
  Ambiente,
  AtorDaObra,
  CabecalhoDaObra,
  ComandoCriarObra,
  ComandoEditarObra,
  ConcedeAcessoDeEngenheiro,
  PeriodoBms,
  PeriodoBmsNovo,
  ResponsavelTecnico,
  ServicoControladoComProjeto,
  VersaoDeQuantidade,
} from './tipos';
