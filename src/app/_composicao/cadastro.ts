/**
 * Operações de cadastro **protegidas**: a fronteira de confiança do servidor.
 *
 * docs/arquitetura/v1.md, 5.2: a verificação de perfil mora em duas camadas, e
 * as duas são obrigatórias. Esta é a primeira — toda função daqui começa por
 * `exigeAcessoNaObra`, antes de validar entrada e antes de chamar caso de uso.
 * A segunda é o `obraId` obrigatório em toda consulta de repositório.
 *
 * Esconder o botão não é controle de acesso (CLAUDE.md, Segurança). É por isso
 * que os casos negativos do QA — CT-012, CT-019, CT-034, CT-035, CT-047,
 * CT-057, CT-070, CT-075, CT-076, CT-083, CT-084 — são testados contra estas
 * funções, e não contra a tela.
 *
 * A ordem também importa: **autorizar antes de validar**. Quem não tem acesso
 * não deve nem descobrir que o formulário dele estava mal preenchido.
 */

import {
  exigeAcessoNaObra,
  exigePermissaoParaCriarObra,
  geraConvite,
  listaAcessosDaObra,
  listaObrasDoUsuario,
  revogaAcesso,
  type AcessoDaObra,
  type Ator,
  type ConviteGerado,
  type ObraResumo,
  type Perfil,
} from '../../modules/acesso';
import {
  analisaCadastrarEquipamento,
  analisaPassagemDeEquipamento,
  cadastraEquipamento,
  encerraPassagem as encerraPassagemDeEquipamento,
  listaEquipamentosDaObra,
  listaMobilizacao as listaMobilizacaoDeEquipamento,
  registraPassagem as registraPassagemDeEquipamento,
  type EquipamentoComPassagens,
  type EquipamentoMobilizado,
} from '../../modules/equipamento';
import {
  analisaCriarObra,
  analisaPeriodoBms,
  analisaQuantidadeDeProjeto,
  analisaResponsavelTecnico,
  cadastraPeriodoBms,
  criaObra,
  defineQuantidadeDeProjeto,
  defineResponsavelTecnico,
  listaHistoricoDeQuantidade,
  listaPeriodosBms,
  listaServicosControlados,
  obtemCabecalhoDaObra,
  resolveBmsDoDia,
  type CabecalhoDaObra,
  type PeriodoBms,
  type ServicoControladoComProjeto,
  type VersaoDeQuantidade,
} from '../../modules/obra';
import {
  analisaCadastrarPessoa,
  analisaPassagem,
  analisaTrocarFuncao,
  cadastraPessoa,
  listaMobilizacao as listaMobilizacaoDePessoal,
  listaPessoalDaObra,
  registraPassagem,
  trocaFuncao,
  type PessoaComPassagens,
  type PessoaMobilizada,
} from '../../modules/pessoal';
import {
  acrescentaTermo,
  listaSugestoesDeMotivo,
  listaTermosAtivos,
  type Termo,
  type TipoDeTaxonomia,
} from '../../modules/taxonomia';
import type { DiaPuro } from '../../shared/date/dia';
import {
  idConfiavel,
  type AcessoId,
  type ObraId,
  type PassagemEquipamentoId,
  type ServicoControladoId,
  type UsuarioId,
} from '../../shared/id';
import { erro, ok, type ErroConhecido, type Result } from '../../shared/result';
import {
  ambienteDeCadastroPadrao,
  paraAcesso,
  paraEquipamento,
  paraObra,
  paraPessoal,
  paraTaxonomia,
  type AmbienteDeCadastro,
} from './ambiente-de-cadastro';

export type Resposta<T> = Result<T, ErroConhecido>;

type Amb = AmbienteDeCadastro;

function idDePassagemDeEquipamento(valor: string): PassagemEquipamentoId {
  return idConfiavel<'passagem_equipamento'>(valor);
}

/** Toda operação protegida começa por aqui. Sem exceção. */
function autoriza(
  ator: Ator,
  obraId: ObraId,
  perfilMinimo: 'engenheiro' | 'encarregado',
  amb: Amb,
): Result<void, ErroConhecido> {
  const permitido = exigeAcessoNaObra(ator, obraId, perfilMinimo, paraAcesso(amb));
  if (!permitido.ok) return erro(permitido.erro);
  return ok(undefined);
}

// ---------------------------------------------------------------- passo 1

export function criaObraProtegida(
  ator: Ator,
  bruto: unknown,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<ObraId> {
  const permitido = exigePermissaoParaCriarObra(ator, paraAcesso(amb));
  if (!permitido.ok) return erro(permitido.erro);

  const cmd = analisaCriarObra(bruto);
  if (!cmd.ok) return erro(cmd.erro);

  const criada = criaObra(cmd.valor, ator, paraObra(amb));
  if (!criada.ok) return erro(criada.erro);
  return ok(criada.valor);
}

export function obtemCabecalhoProtegido(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<CabecalhoDaObra> {
  const permitido = autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const cabecalho = obtemCabecalhoDaObra(obraId, paraObra(amb));
  if (!cabecalho.ok) return erro(cabecalho.erro);
  return ok(cabecalho.valor);
}

export function defineResponsavelTecnicoProtegido(
  ator: Ator,
  obraId: ObraId,
  bruto: {
    respTecnicoNome?: unknown;
    respTecnicoTitulo?: unknown;
    respTecnicoCrea?: unknown;
  },
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<void> {
  const permitido = autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const resp = analisaResponsavelTecnico(bruto);
  if (!resp.ok) return erro(resp.erro);

  const definido = defineResponsavelTecnico(obraId, resp.valor, paraObra(amb));
  if (!definido.ok) return erro(definido.erro);
  return ok(undefined);
}

export function cadastraPeriodoBmsProtegido(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<string> {
  const permitido = autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaPeriodoBms({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const criado = cadastraPeriodoBms(cmd.valor, ator, paraObra(amb));
  if (!criado.ok) return erro(criado.erro);
  return ok(criado.valor);
}

export function listaPeriodosBmsProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<PeriodoBms[]> {
  const permitido = autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const lista = listaPeriodosBms(obraId, paraObra(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

export function resolveBmsDoDiaProtegido(
  ator: Ator,
  obraId: ObraId,
  dia: DiaPuro,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<number | null> {
  const permitido = autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const bms = resolveBmsDoDia(obraId, dia, paraObra(amb));
  if (!bms.ok) return erro(bms.erro);
  return ok(bms.valor);
}

// ---------------------------------------------------------------- passo 2

export function cadastraPessoaProtegida(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<string> {
  const permitido = autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaCadastrarPessoa({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const criada = cadastraPessoa(cmd.valor, ator, paraPessoal(amb));
  if (!criada.ok) return erro(criada.erro);
  return ok(criada.valor);
}

export function registraPassagemProtegida(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<string> {
  const permitido = autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaPassagem({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const criada = registraPassagem(cmd.valor, ator, paraPessoal(amb));
  if (!criada.ok) return erro(criada.erro);
  return ok(criada.valor);
}

/**
 * Troca de função (decisão 29.1): encerra a passagem vigente e abre outra.
 *
 * **Só o engenheiro**, como todo o cadastro de pessoal. Devolve o id da
 * passagem nova.
 */
export function trocaFuncaoProtegida(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<string> {
  const permitido = autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaTrocarFuncao({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const trocada = trocaFuncao(cmd.valor, ator, paraPessoal(amb));
  if (!trocada.ok) return erro(trocada.erro);
  return ok(trocada.valor);
}

/**
 * **Só o engenheiro** (CT-034). O tipo devolvido carrega nome de trabalhador;
 * o encarregado não recebe a lista nem sabe que ela existe.
 */
export function listaPessoalProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<PessoaComPassagens[]> {
  const permitido = autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const lista = listaPessoalDaObra(obraId, paraPessoal(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

/**
 * A mobilização de pessoal da obra, sem nome: as passagens cruas.
 *
 * O encarregado pode ver, porque não há nome aqui. **Não é o efetivo do RDO**:
 * quem conta é `src/modules/rdo/efetivo.ts`, que é quem conhece o estado do dia
 * (5.1) e o formato do bloco 5. Havia duas agregações no sistema; sobrou uma.
 */
export function listaMobilizacaoDePessoalProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<PessoaMobilizada[]> {
  const permitido = autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const mobilizacao = listaMobilizacaoDePessoal(obraId, paraPessoal(amb));
  if (!mobilizacao.ok) return erro(mobilizacao.erro);
  return ok(mobilizacao.valor);
}

export function cadastraEquipamentoProtegido(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<string> {
  const permitido = autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaCadastrarEquipamento({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const criado = cadastraEquipamento(cmd.valor, ator, paraEquipamento(amb));
  if (!criado.ok) return erro(criado.erro);
  return ok(criado.valor);
}

export function registraPassagemDeEquipamentoProtegida(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<string> {
  const permitido = autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaPassagemDeEquipamento({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const criada = registraPassagemDeEquipamento(cmd.valor, ator, paraEquipamento(amb));
  if (!criada.ok) return erro(criada.erro);
  return ok(criada.valor);
}

export function listaEquipamentosProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<EquipamentoComPassagens[]> {
  const permitido = autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const lista = listaEquipamentosDaObra(obraId, paraEquipamento(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

/** Como em `pessoal`: mobilização crua, e a contagem do bloco 6 é do `rdo`. */
export function listaMobilizacaoDeEquipamentoProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<EquipamentoMobilizado[]> {
  const permitido = autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const mobilizacao = listaMobilizacaoDeEquipamento(obraId, paraEquipamento(amb));
  if (!mobilizacao.ok) return erro(mobilizacao.erro);
  return ok(mobilizacao.valor);
}

export function encerraPassagemDeEquipamentoProtegida(
  ator: Ator,
  obraId: ObraId,
  passagemId: string,
  saida: DiaPuro,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<void> {
  const permitido = autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const encerrada = encerraPassagemDeEquipamento(
    { obraId, passagemId: idDePassagemDeEquipamento(passagemId), saida },
    paraEquipamento(amb),
  );
  if (!encerrada.ok) return erro(encerrada.erro);
  return ok(undefined);
}

// ---------------------------------------------------------------- serviços

export function defineQuantidadeDeProjetoProtegida(
  ator: Ator,
  obraId: ObraId,
  servicoId: ServicoControladoId,
  quantidade: unknown,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<void> {
  const permitido = autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaQuantidadeDeProjeto({ obraId, servicoId, quantidade });
  if (!cmd.ok) return erro(cmd.erro);

  const definida = defineQuantidadeDeProjeto(cmd.valor, ator, paraObra(amb));
  if (!definida.ok) return erro(definida.erro);
  return ok(undefined);
}

export function listaServicosProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<ServicoControladoComProjeto[]> {
  const permitido = autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const lista = listaServicosControlados(obraId, paraObra(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

export function listaHistoricoDeQuantidadeProtegido(
  ator: Ator,
  obraId: ObraId,
  servicoId: ServicoControladoId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<VersaoDeQuantidade[]> {
  const permitido = autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const historico = listaHistoricoDeQuantidade(obraId, servicoId, paraObra(amb));
  if (!historico.ok) return erro(historico.erro);
  return ok(historico.valor);
}

// ---------------------------------------------------------------- taxonomia

/**
 * Taxonomia tem escopo de sistema (19.2), mas a edição continua sendo ato de
 * engenheiro **em alguma obra**: é de lá que a tela chama. O efeito é global
 * (CT-068); a permissão é local (CT-070).
 */
export function acrescentaTermoProtegido(
  ator: Ator,
  obraId: ObraId,
  tipo: TipoDeTaxonomia,
  termo: string,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<string> {
  const permitido = autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const criado = acrescentaTermo(tipo, termo, paraTaxonomia(amb));
  if (!criado.ok) return erro(criado.erro);
  return ok(criado.valor);
}

/** Leitura é dos dois perfis: o encarregado precisa da lista para lançar. */
export function listaTermosProtegida(
  ator: Ator,
  obraId: ObraId,
  tipo: TipoDeTaxonomia,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<Termo[]> {
  const permitido = autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const lista = listaTermosAtivos(tipo, paraTaxonomia(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

export function listaSugestoesDeMotivoProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<string[]> {
  const permitido = autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const lista = listaSugestoesDeMotivo(paraTaxonomia(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

// ---------------------------------------------------------------- passo 3

/**
 * Gera o link de convite no perfil pedido (34.1).
 *
 * `perfil` é `Perfil`, não `string`: quem chama já passou pela conversão de
 * `perfilDeConvite`, e a Server Action não tem como empurrar texto cru daqui
 * para dentro. Quem convida continua tendo de ser engenheiro **daquela obra**,
 * e quem confere isso é `geraConvite`, contra a tabela `acesso`.
 */
export function geraConviteProtegido(
  ator: Ator,
  obraId: ObraId,
  perfil: Perfil,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<ConviteGerado> {
  const gerado = geraConvite(obraId, perfil, ator, paraAcesso(amb));
  if (!gerado.ok) return erro(gerado.erro);
  return ok(gerado.valor);
}

/**
 * Quem tem acesso à obra.
 *
 * `listaAcessosDaObra` já exige engenheiro por conta própria; a verificação
 * daqui é a mesma de todas as outras leituras da obra, e existe para que a
 * página não precise conhecer duas convenções diferentes. Duas camadas, como
 * manda a 5.2.
 */
export function listaAcessosDaObraProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<AcessoDaObra[]> {
  const permitido = autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const lista = listaAcessosDaObra(obraId, ator, paraAcesso(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

export function revogaAcessoProtegido(
  ator: Ator,
  acessoId: AcessoId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<void> {
  const revogado = revogaAcesso(acessoId, ator, paraAcesso(amb));
  if (!revogado.ok) return erro(revogado.erro);
  return ok(undefined);
}

export function listaObrasDoUsuarioProtegida(
  usuarioId: UsuarioId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Resposta<ObraResumo[]> {
  const lista = listaObrasDoUsuario(usuarioId, paraAcesso(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}
