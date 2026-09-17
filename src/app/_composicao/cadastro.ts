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
  analisaEditarObra,
  analisaPeriodoBms,
  analisaQuantidadeDeProjeto,
  analisaResponsavelTecnico,
  atualizaPeriodoBms,
  cadastraPeriodoBms,
  editaCadastroDaObra,
  excluiPeriodoBms,
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
async function autoriza(
  ator: Ator,
  obraId: ObraId,
  perfilMinimo: 'engenheiro' | 'encarregado',
  amb: Amb,
): Promise<Result<void, ErroConhecido>> {
  const permitido = await exigeAcessoNaObra(ator, obraId, perfilMinimo, paraAcesso(amb));
  if (!permitido.ok) return erro(permitido.erro);
  return ok(undefined);
}

// ---------------------------------------------------------------- passo 1

export async function criaObraProtegida(
  ator: Ator,
  bruto: unknown,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<ObraId>> {
  const permitido = await exigePermissaoParaCriarObra(ator, paraAcesso(amb));
  if (!permitido.ok) return erro(permitido.erro);

  const cmd = analisaCriarObra(bruto);
  if (!cmd.ok) return erro(cmd.erro);

  const criada = criaObra(cmd.valor, ator, paraObra(amb));
  if (!criada.ok) return erro(criada.erro);
  return ok(criada.valor);
}

export async function obtemCabecalhoProtegido(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<CabecalhoDaObra>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const cabecalho = obtemCabecalhoDaObra(obraId, paraObra(amb));
  if (!cabecalho.ok) return erro(cabecalho.erro);
  return ok(cabecalho.valor);
}

export async function defineResponsavelTecnicoProtegido(
  ator: Ator,
  obraId: ObraId,
  bruto: {
    respTecnicoNome?: unknown;
    respTecnicoTitulo?: unknown;
    respTecnicoCrea?: unknown;
  },
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<void>> {
  const permitido = await autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const resp = analisaResponsavelTecnico(bruto);
  if (!resp.ok) return erro(resp.erro);

  const definido = defineResponsavelTecnico(obraId, resp.valor, paraObra(amb));
  if (!definido.ok) return erro(definido.erro);
  return ok(undefined);
}

export async function cadastraPeriodoBmsProtegido(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<string>> {
  const permitido = await autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaPeriodoBms({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const criado = cadastraPeriodoBms(cmd.valor, ator, paraObra(amb));
  if (!criado.ok) return erro(criado.erro);
  return ok(criado.valor);
}

export async function listaPeriodosBmsProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<PeriodoBms[]>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const lista = listaPeriodosBms(obraId, paraObra(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

export async function resolveBmsDoDiaProtegido(
  ator: Ator,
  obraId: ObraId,
  dia: DiaPuro,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<number | null>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const bms = resolveBmsDoDia(obraId, dia, paraObra(amb));
  if (!bms.ok) return erro(bms.erro);
  return ok(bms.valor);
}

// ---------------------------------------------------------------- passo 2

export async function cadastraPessoaProtegida(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<string>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaCadastrarPessoa({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const criada = await cadastraPessoa(cmd.valor, ator, paraPessoal(amb));
  if (!criada.ok) return erro(criada.erro);
  return ok(criada.valor);
}

export async function registraPassagemProtegida(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<string>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaPassagem({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const criada = await registraPassagem(cmd.valor, ator, paraPessoal(amb));
  if (!criada.ok) return erro(criada.erro);
  return ok(criada.valor);
}

/**
 * Troca de função (decisão 29.1): encerra a passagem vigente e abre outra.
 *
 * **Os dois perfis escrevem**, como todo o cadastro de pessoal desde a decisão
 * do dono do produto de 17/09/2026. Devolve o id da passagem nova.
 */
export async function trocaFuncaoProtegida(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<string>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaTrocarFuncao({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const trocada = await trocaFuncao(cmd.valor, ator, paraPessoal(amb));
  if (!trocada.ok) return erro(trocada.erro);
  return ok(trocada.valor);
}

/**
 * **Os dois perfis leem** (decisão de 17/09/2026, que revisou o CT-034).
 *
 * O tipo devolvido carrega nome de trabalhador, e por isso a lista era
 * exclusiva do engenheiro. O encarregado passou a ler porque convive com essas
 * pessoas todo dia e precisa conferir quem está mobilizado; na segunda decisão
 * do mesmo dia passou também a escrever — cadastrar, abrir passagem e trocar de
 * função são dele, que é quem vê o canteiro.
 *
 * A fronteira que não se moveu é a da **obra**: quem não tem acesso continua
 * recebendo a recusa genérica, sem nome nenhum.
 */
export async function listaPessoalProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<PessoaComPassagens[]>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const lista = await listaPessoalDaObra(obraId, paraPessoal(amb));
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
export async function listaMobilizacaoDePessoalProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<PessoaMobilizada[]>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const mobilizacao = await listaMobilizacaoDePessoal(obraId, paraPessoal(amb));
  if (!mobilizacao.ok) return erro(mobilizacao.erro);
  return ok(mobilizacao.valor);
}

export async function cadastraEquipamentoProtegido(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<string>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaCadastrarEquipamento({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const criado = await cadastraEquipamento(cmd.valor, ator, paraEquipamento(amb));
  if (!criado.ok) return erro(criado.erro);
  return ok(criado.valor);
}

export async function registraPassagemDeEquipamentoProtegida(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<string>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaPassagemDeEquipamento({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const criada = await registraPassagemDeEquipamento(
    cmd.valor,
    ator,
    paraEquipamento(amb),
  );
  if (!criada.ok) return erro(criada.erro);
  return ok(criada.valor);
}

export async function listaEquipamentosProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<EquipamentoComPassagens[]>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const lista = await listaEquipamentosDaObra(obraId, paraEquipamento(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

/** Como em `pessoal`: mobilização crua, e a contagem do bloco 6 é do `rdo`. */
export async function listaMobilizacaoDeEquipamentoProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<EquipamentoMobilizado[]>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const mobilizacao = await listaMobilizacaoDeEquipamento(obraId, paraEquipamento(amb));
  if (!mobilizacao.ok) return erro(mobilizacao.erro);
  return ok(mobilizacao.valor);
}

export async function encerraPassagemDeEquipamentoProtegida(
  ator: Ator,
  obraId: ObraId,
  passagemId: string,
  saida: DiaPuro,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<void>> {
  const permitido = await autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const encerrada = await encerraPassagemDeEquipamento(
    { obraId, passagemId: idDePassagemDeEquipamento(passagemId), saida },
    paraEquipamento(amb),
  );
  if (!encerrada.ok) return erro(encerrada.erro);
  return ok(undefined);
}

// ---------------------------------------------------------------- serviços

export async function defineQuantidadeDeProjetoProtegida(
  ator: Ator,
  obraId: ObraId,
  servicoId: ServicoControladoId,
  quantidade: unknown,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<void>> {
  const permitido = await autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaQuantidadeDeProjeto({ obraId, servicoId, quantidade });
  if (!cmd.ok) return erro(cmd.erro);

  const definida = defineQuantidadeDeProjeto(cmd.valor, ator, paraObra(amb));
  if (!definida.ok) return erro(definida.erro);
  return ok(undefined);
}

export async function listaServicosProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<ServicoControladoComProjeto[]>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const lista = listaServicosControlados(obraId, paraObra(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

export async function listaHistoricoDeQuantidadeProtegido(
  ator: Ator,
  obraId: ObraId,
  servicoId: ServicoControladoId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<VersaoDeQuantidade[]>> {
  const permitido = await autoriza(ator, obraId, 'engenheiro', amb);
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
export async function acrescentaTermoProtegido(
  ator: Ator,
  obraId: ObraId,
  tipo: TipoDeTaxonomia,
  termo: string,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<string>> {
  const permitido = await autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const criado = acrescentaTermo(tipo, termo, paraTaxonomia(amb));
  if (!criado.ok) return erro(criado.erro);
  return ok(criado.valor);
}

/** Leitura é dos dois perfis: o encarregado precisa da lista para lançar. */
export async function listaTermosProtegida(
  ator: Ator,
  obraId: ObraId,
  tipo: TipoDeTaxonomia,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<Termo[]>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
  if (!permitido.ok) return permitido;

  const lista = listaTermosAtivos(tipo, paraTaxonomia(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

export async function listaSugestoesDeMotivoProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<string[]>> {
  const permitido = await autoriza(ator, obraId, 'encarregado', amb);
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
export async function geraConviteProtegido(
  ator: Ator,
  obraId: ObraId,
  perfil: Perfil,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<ConviteGerado>> {
  const gerado = await geraConvite(obraId, perfil, ator, paraAcesso(amb));
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
export async function listaAcessosDaObraProtegida(
  ator: Ator,
  obraId: ObraId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<AcessoDaObra[]>> {
  const permitido = await autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const lista = await listaAcessosDaObra(obraId, ator, paraAcesso(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

export async function revogaAcessoProtegido(
  ator: Ator,
  acessoId: AcessoId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<void>> {
  const revogado = await revogaAcesso(acessoId, ator, paraAcesso(amb));
  if (!revogado.ok) return erro(revogado.erro);
  return ok(undefined);
}

export async function listaObrasDoUsuarioProtegida(
  usuarioId: UsuarioId,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<ObraResumo[]>> {
  const lista = await listaObrasDoUsuario(usuarioId, paraAcesso(amb));
  if (!lista.ok) return erro(lista.erro);
  return ok(lista.valor);
}

/**
 * Editar as informações gerais da obra (17/09/2026).
 *
 * **A correção vale para todos os RDOs, inclusive os já emitidos** — decisão do
 * dono do produto. O cabeçalho não é versionado: existe um texto só, e ele é o
 * atual. A consequência, aceita conscientemente, é que reimprimir um RDO antigo
 * depois de uma correção dá um documento diferente do que o fiscal recebeu.
 *
 * Por isso a tela mostra o tamanho disso antes de salvar
 * (`_composicao/impacto.ts`), e `registro_exportacao` guarda o que já saiu.
 */
export async function editaCadastroDaObraProtegida(
  ator: Ator,
  obraId: ObraId,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<void>> {
  const permitido = await autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaEditarObra(bruto);
  if (!cmd.ok) return erro(cmd.erro);

  const editada = editaCadastroDaObra({ ...cmd.valor, obraId }, paraObra(amb));
  if (!editada.ok) return erro(editada.erro);
  return ok(undefined);
}

export async function atualizaPeriodoBmsProtegido(
  ator: Ator,
  obraId: ObraId,
  periodoId: string,
  bruto: Record<string, unknown>,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<void>> {
  const permitido = await autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const cmd = analisaPeriodoBms({ ...bruto, obraId });
  if (!cmd.ok) return erro(cmd.erro);

  const atualizado = atualizaPeriodoBms(
    { ...cmd.valor, periodoId: idConfiavel<'periodo_bms'>(periodoId) },
    paraObra(amb),
  );
  if (!atualizado.ok) return erro(atualizado.erro);
  return ok(undefined);
}

/**
 * Excluir período de BM'S.
 *
 * Não bloqueia por haver dia lançado dentro: o dia continua lançado e o campo
 * `BM'S` do RDO passa a sair vazio com aviso (decisão 21.1). A tela mostra
 * quantos dias isso alcança antes de confirmar.
 */
export async function excluiPeriodoBmsProtegido(
  ator: Ator,
  obraId: ObraId,
  periodoId: string,
  amb: Amb = ambienteDeCadastroPadrao(),
): Promise<Resposta<void>> {
  const permitido = await autoriza(ator, obraId, 'engenheiro', amb);
  if (!permitido.ok) return permitido;

  const excluido = excluiPeriodoBms(
    obraId,
    idConfiavel<'periodo_bms'>(periodoId),
    paraObra(amb),
  );
  if (!excluido.ok) return erro(excluido.erro);
  return ok(undefined);
}
