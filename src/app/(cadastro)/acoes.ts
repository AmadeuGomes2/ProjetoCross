'use server';

/**
 * Ações de servidor das telas de cadastro.
 *
 * Toda ação faz, nesta ordem: identifica o portador, **autoriza** e só então
 * valida a entrada. O erro volta para a tela pela busca da URL, em texto que
 * diz o que corrigir — nunca rastro de pilha, nunca nome de pessoa
 * (CLAUDE.md, Segurança).
 *
 * As ações não decidem regra de negócio: chamam uma função de
 * `src/app/_composicao/cadastro.ts` e redirecionam. Página fina, regra no
 * módulo (padroes-codigo, Estrutura de pastas).
 */

import { redirect } from 'next/navigation';

import {
  aceitaConviteEEntra,
  iniciaSessaoComSenha,
  perfilDeConvite,
  registraUsuario,
} from '../../modules/acesso';
import {
  acrescentaTermoProtegido,
  cadastraEquipamentoProtegido,
  atualizaPeriodoBmsProtegido,
  cadastraPeriodoBmsProtegido,
  editaCadastroDaObraProtegida,
  excluiPeriodoBmsProtegido,
  cadastraPessoaProtegida,
  criaObraProtegida,
  defineQuantidadeDeProjetoProtegida,
  defineResponsavelTecnicoProtegido,
  geraConviteProtegido,
  revogaAcessoProtegido,
  trocaFuncaoProtegida,
} from '../_composicao/cadastro';
import {
  ambienteDeCadastroPadrao,
  paraAcesso,
} from '../_composicao/ambiente-de-cadastro';
import { idConfiavel, type ObraId } from '../../shared/id';
import { ehTipoDeTaxonomia } from '../../modules/taxonomia';
import { apagaCookieDeSessao, atorDaRequisicao, gravaCookieDeSessao } from './sessao';
import type { EstadoDoConvite } from './tipos-de-tela';

/** Texto de formulário. Nunca `any`: o que chega do navegador é `unknown`. */
function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === 'string' ? valor : '';
}

function voltaCom(destino: string, mensagem: string): never {
  redirect(`${destino}?erro=${encodeURIComponent(mensagem)}`);
}

export async function entrarAction(dados: FormData): Promise<void> {
  const entrada = await iniciaSessaoComSenha(
    texto(dados, 'email'),
    texto(dados, 'senha'),
    paraAcesso(ambienteDeCadastroPadrao()),
  );
  if (!entrada.ok) voltaCom('/entrar', entrada.erro.mensagem);

  await gravaCookieDeSessao(entrada.valor.token, entrada.valor.atributos);
  redirect('/obras');
}

/**
 * Não existe `criarContaAction`.
 *
 * Decisão 25.1, de 16/09/2026: **não há cadastro público**. A ação que criava
 * conta de engenheiro a partir da tela de entrada foi removida — com ela,
 * qualquer pessoa que alcançasse o endereço abria conta. A primeira conta nasce
 * por `npm run criar-engenheiro`, fora da web; o encarregado ganha a dele ao
 * aceitar o convite, em `aceitarConviteAction`, que exige um token válido.
 */
export async function sairAction(): Promise<void> {
  await apagaCookieDeSessao();
  redirect('/entrar');
}

async function exigeAtor() {
  const ator = await atorDaRequisicao();
  if (ator === null) {
    redirect(`/entrar?erro=${encodeURIComponent('Entre para continuar.')}`);
  }
  return { ator };
}

export async function criarObraAction(dados: FormData): Promise<void> {
  const { ator } = await exigeAtor();

  const criada = await criaObraProtegida(ator, {
    contrato: texto(dados, 'contrato'),
    contratante: texto(dados, 'contratante'),
    contratada: texto(dados, 'contratada'),
    dataInicio: texto(dados, 'dataInicio'),
    dataTermino: texto(dados, 'dataTermino'),
    escopo: texto(dados, 'escopo'),
    nomeProjeto: texto(dados, 'nomeProjeto'),
    area: texto(dados, 'area'),
    local: texto(dados, 'local'),
    respTecnicoNome: texto(dados, 'respTecnicoNome'),
    respTecnicoTitulo: texto(dados, 'respTecnicoTitulo'),
    respTecnicoCrea: texto(dados, 'respTecnicoCrea'),
    // Decisão 21.1: ao menos um período de BMS é obrigatório na criação.
    periodosBms: [
      {
        numero: texto(dados, 'bmsNumero'),
        dataInicial: texto(dados, 'bmsInicio'),
        dataFinal: texto(dados, 'bmsFim'),
      },
    ],
  });
  if (!criada.ok) voltaCom('/obras/nova', criada.erro.mensagem);

  redirect(`/obras/${criada.valor}`);
}

function obraDaForma(dados: FormData): ObraId {
  return idConfiavel<'obra'>(texto(dados, 'obraId'));
}

export async function cadastrarPeriodoAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const criado = await cadastraPeriodoBmsProtegido(ator, obraId, {
    numero: texto(dados, 'numero'),
    dataInicial: texto(dados, 'dataInicial'),
    dataFinal: texto(dados, 'dataFinal'),
  });
  if (!criado.ok) voltaCom(`/obras/${obraId}`, criado.erro.mensagem);
  redirect(`/obras/${obraId}`);
}

export async function definirResponsavelAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const definido = await defineResponsavelTecnicoProtegido(ator, obraId, {
    respTecnicoNome: texto(dados, 'respTecnicoNome'),
    respTecnicoTitulo: texto(dados, 'respTecnicoTitulo'),
    respTecnicoCrea: texto(dados, 'respTecnicoCrea'),
  });
  if (!definido.ok) voltaCom(`/obras/${obraId}`, definido.erro.mensagem);
  redirect(`/obras/${obraId}`);
}

export async function cadastrarPessoaAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const criada = await cadastraPessoaProtegida(ator, obraId, {
    nome: texto(dados, 'nome'),
    funcao: texto(dados, 'funcao'),
    entrada: texto(dados, 'entrada'),
    saida: texto(dados, 'saida'),
  });
  if (!criada.ok) voltaCom(`/obras/${obraId}/pessoal`, criada.erro.mensagem);
  redirect(`/obras/${obraId}/pessoal`);
}

/**
 * Decisão 29.1: trocar de função **encerra a passagem e abre outra**. Não
 * existe ação que edite a função de uma passagem já gravada.
 */
export async function trocarFuncaoAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const trocada = await trocaFuncaoProtegida(ator, obraId, {
    pessoaId: texto(dados, 'pessoaId'),
    funcao: texto(dados, 'funcao'),
    aPartirDe: texto(dados, 'aPartirDe'),
  });
  if (!trocada.ok) voltaCom(`/obras/${obraId}/pessoal`, trocada.erro.mensagem);
  redirect(`/obras/${obraId}/pessoal`);
}

export async function cadastrarEquipamentoAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const criado = await cadastraEquipamentoProtegido(ator, obraId, {
    identificador: texto(dados, 'identificador'),
    tipo: texto(dados, 'tipo'),
    entrada: texto(dados, 'entrada'),
    saida: texto(dados, 'saida'),
  });
  if (!criado.ok) voltaCom(`/obras/${obraId}/equipamento`, criado.erro.mensagem);
  redirect(`/obras/${obraId}/equipamento`);
}

export async function definirQuantidadeAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const definida = await defineQuantidadeDeProjetoProtegida(
    ator,
    obraId,
    idConfiavel<'servico_controlado'>(texto(dados, 'servicoId')),
    texto(dados, 'quantidade'),
  );
  if (!definida.ok) voltaCom(`/obras/${obraId}/servicos`, definida.erro.mensagem);
  redirect(`/obras/${obraId}/servicos`);
}

export async function acrescentarTermoAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const tipo = texto(dados, 'tipo');
  if (!ehTipoDeTaxonomia(tipo)) {
    voltaCom(`/obras/${obraId}/taxonomia`, 'Escolha uma lista válida.');
  }

  const criado = await acrescentaTermoProtegido(
    ator,
    obraId,
    tipo,
    texto(dados, 'termo'),
  );
  if (!criado.ok) voltaCom(`/obras/${obraId}/taxonomia`, criado.erro.mensagem);
  redirect(`/obras/${obraId}/taxonomia`);
}

/**
 * Gera o convite e devolve o link **na resposta da ação**, não na URL.
 *
 * O token não pode ir para a barra de endereço: dali ele cai no histórico do
 * navegador e no log de acesso do servidor, e o PRD é explícito — o token não
 * aparece em log, em mensagem de erro, em URL registrada nem em histórico
 * (CT-085). Por isso esta é a única ação da tela de cadastro que devolve
 * estado em vez de redirecionar.
 */
/**
 * Gera o link de convite, no perfil escolhido (decisão 34.1).
 *
 * O perfil vem do formulário e é hostil como qualquer campo: passa por
 * `perfilDeConvite` antes de existir como `Perfil`. Quem pode convidar
 * continua sendo o engenheiro **daquela obra**, conferido no servidor por
 * `geraConviteProtegido` — o `select` da tela não é controle de acesso.
 */
export async function gerarConviteAction(
  _estado: EstadoDoConvite,
  dados: FormData,
): Promise<EstadoDoConvite> {
  const obraId = obraDaForma(dados);
  const ator = await atorDaRequisicao();
  if (ator === null) return { link: null, perfil: null, erro: 'Entre para continuar.' };

  const perfil = perfilDeConvite(texto(dados, 'perfil'));
  if (!perfil.ok) return { link: null, perfil: null, erro: perfil.erro.mensagem };

  const gerado = geraConviteProtegido(ator, obraId, perfil.valor);
  if (!gerado.ok) return { link: null, perfil: null, erro: gerado.erro.mensagem };

  return { link: `/convite/${gerado.valor.token}`, perfil: perfil.valor, erro: null };
}

export async function revogarAcessoAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const revogado = await revogaAcessoProtegido(
    ator,
    idConfiavel<'acesso'>(texto(dados, 'acessoId')),
  );
  if (!revogado.ok) voltaCom(`/obras/${obraId}/acesso`, revogado.erro.mensagem);
  redirect(`/obras/${obraId}/acesso`);
}

/**
 * Aceita o convite e entra.
 *
 * O encarregado chega pelo link sem ter conta: a conta é criada e o convite é
 * consumido no mesmo pedido. Se já houver sessão aberta, o convite é aceito
 * para o usuário que está logado.
 *
 * O token **não** volta para a URL de erro: a mensagem é genérica e o link fica
 * onde já estava, na barra de endereço de quem o recebeu.
 */
export async function aceitarConviteAction(dados: FormData): Promise<void> {
  const amb = ambienteDeCadastroPadrao();
  const token = texto(dados, 'token');
  const destino = '/convite/recusado';

  let ator = await atorDaRequisicao();
  if (ator === null) {
    const criado = await registraUsuario(
      {
        nome: texto(dados, 'nome'),
        email: texto(dados, 'email'),
        senha: texto(dados, 'senha'),
      },
      paraAcesso(amb),
    );
    if (!criado.ok) voltaCom(destino, criado.erro.mensagem);

    const entrada = await iniciaSessaoComSenha(
      texto(dados, 'email'),
      texto(dados, 'senha'),
      paraAcesso(amb),
    );
    if (!entrada.ok) voltaCom(destino, entrada.erro.mensagem);
    await gravaCookieDeSessao(entrada.valor.token, entrada.valor.atributos);
    ator = entrada.valor.ator;
  }

  const aceite = await aceitaConviteEEntra(token, ator.usuarioId, paraAcesso(amb));
  if (!aceite.ok) voltaCom(destino, aceite.erro.mensagem);

  redirect(`/obras/${aceite.valor.obraId}`);
}

/**
 * Editar as informações gerais da obra (17/09/2026).
 *
 * A correção vale para todos os RDOs, inclusive os já emitidos — decisão do
 * dono do produto. A tela avisa o tamanho disso antes, com `AvisoDeImpacto`.
 */
export async function editarObraAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const editada = await editaCadastroDaObraProtegida(ator, obraId, {
    contrato: texto(dados, 'contrato'),
    contratante: texto(dados, 'contratante'),
    contratada: texto(dados, 'contratada'),
    dataInicio: texto(dados, 'dataInicio'),
    dataTermino: texto(dados, 'dataTermino'),
    escopo: texto(dados, 'escopo'),
    nomeProjeto: texto(dados, 'nomeProjeto'),
    area: texto(dados, 'area'),
    local: texto(dados, 'local'),
  });
  if (!editada.ok) voltaCom(`/obras/${obraId}`, editada.erro.mensagem);
  redirect(`/obras/${obraId}`);
}

export async function editarPeriodoAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const atualizado = await atualizaPeriodoBmsProtegido(
    ator,
    obraId,
    texto(dados, 'periodoId'),
    {
      numero: texto(dados, 'numero'),
      dataInicial: texto(dados, 'dataInicial'),
      dataFinal: texto(dados, 'dataFinal'),
    },
  );
  if (!atualizado.ok) voltaCom(`/obras/${obraId}`, atualizado.erro.mensagem);
  redirect(`/obras/${obraId}`);
}

/**
 * Excluir período de BM'S.
 *
 * Não bloqueia por haver dia lançado dentro: o dia continua lançado e o campo
 * `BM'S` do RDO passa a sair vazio com aviso (decisão 21.1). Nenhum lançamento
 * se perde — é o que o aviso da tela diz antes de confirmar.
 */
export async function excluirPeriodoAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const excluido = await excluiPeriodoBmsProtegido(
    ator,
    obraId,
    texto(dados, 'periodoId'),
  );
  if (!excluido.ok) voltaCom(`/obras/${obraId}`, excluido.erro.mensagem);
  redirect(`/obras/${obraId}`);
}
