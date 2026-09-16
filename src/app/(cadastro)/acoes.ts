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
  registraUsuario,
} from '../../modules/acesso';
import {
  acrescentaTermoProtegido,
  cadastraEquipamentoProtegido,
  cadastraPeriodoBmsProtegido,
  cadastraPessoaProtegida,
  criaObraProtegida,
  defineQuantidadeDeProjetoProtegida,
  defineResponsavelTecnicoProtegido,
  geraConviteProtegido,
  revogaAcessoProtegido,
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

  const criada = criaObraProtegida(ator, {
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

  const criado = cadastraPeriodoBmsProtegido(ator, obraId, {
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

  const definido = defineResponsavelTecnicoProtegido(ator, obraId, {
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

  const criada = cadastraPessoaProtegida(ator, obraId, {
    nome: texto(dados, 'nome'),
    funcao: texto(dados, 'funcao'),
    entrada: texto(dados, 'entrada'),
    saida: texto(dados, 'saida'),
  });
  if (!criada.ok) voltaCom(`/obras/${obraId}/pessoal`, criada.erro.mensagem);
  redirect(`/obras/${obraId}/pessoal`);
}

export async function cadastrarEquipamentoAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const criado = cadastraEquipamentoProtegido(ator, obraId, {
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

  const definida = defineQuantidadeDeProjetoProtegida(
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

  const criado = acrescentaTermoProtegido(ator, obraId, tipo, texto(dados, 'termo'));
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
export async function gerarConviteAction(
  _estado: EstadoDoConvite,
  dados: FormData,
): Promise<EstadoDoConvite> {
  const obraId = obraDaForma(dados);
  const ator = await atorDaRequisicao();
  if (ator === null) return { link: null, erro: 'Entre para continuar.' };

  const gerado = geraConviteProtegido(ator, obraId);
  if (!gerado.ok) return { link: null, erro: gerado.erro.mensagem };

  return { link: `/convite/${gerado.valor.token}`, erro: null };
}

export async function revogarAcessoAction(dados: FormData): Promise<void> {
  const obraId = obraDaForma(dados);
  const { ator } = await exigeAtor();

  const revogado = revogaAcessoProtegido(
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

  const aceite = aceitaConviteEEntra(token, ator.usuarioId, paraAcesso(amb));
  if (!aceite.ok) voltaCom(destino, aceite.erro.mensagem);

  redirect(`/obras/${aceite.valor.obraId}`);
}
