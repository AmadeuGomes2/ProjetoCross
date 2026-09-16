/**
 * Resultado de operação que pode falhar de forma esperada.
 *
 * Erro esperado de domínio é RESULTADO, não exceção (padroes-codigo, Erro).
 * Quem chama é obrigado pelo compilador a tratar os dois lados.
 *
 * Exceção continua existindo para o inesperado, e sobe até a borda.
 */

export type Result<T, E = ErroDeDominio> =
  { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly erro: E };

export function ok<T>(valor: T): Result<T, never> {
  return { ok: true, valor };
}

export function erro<E>(e: E): Result<never, E> {
  return { ok: false, erro: e };
}

/** Códigos de erro. Estáveis: viram chave de tradução e de log. */
export const CODIGO_ERRO = {
  DIA_INVALIDO: 'DIA_INVALIDO',
  DIA_FORA_DO_CALENDARIO: 'DIA_FORA_DO_CALENDARIO',
  DATA_FINAL_ANTES_DA_INICIAL: 'DATA_FINAL_ANTES_DA_INICIAL',
  DATA_FORA_DO_PERIODO_DA_OBRA: 'DATA_FORA_DO_PERIODO_DA_OBRA',
  DATA_FUTURA: 'DATA_FUTURA',
  QUANTIDADE_INVALIDA: 'QUANTIDADE_INVALIDA',
  QUANTIDADE_CASAS_DEMAIS: 'QUANTIDADE_CASAS_DEMAIS',
  QUANTIDADE_NAO_POSITIVA: 'QUANTIDADE_NAO_POSITIVA',
  TERMO_VAZIO: 'TERMO_VAZIO',
  MOTIVO_OBRIGATORIO: 'MOTIVO_OBRIGATORIO',
  DIA_PARADO_NAO_ACEITA_ATIVIDADE: 'DIA_PARADO_NAO_ACEITA_ATIVIDADE',
  DIA_FECHADO: 'DIA_FECHADO',
  SEM_PERMISSAO: 'SEM_PERMISSAO',
  NAO_ENCONTRADO: 'NAO_ENCONTRADO',
  DIA_JA_TEM_ATIVIDADE: 'DIA_JA_TEM_ATIVIDADE',
  FORA_DO_PERIODO_DA_OBRA: 'FORA_DO_PERIODO_DA_OBRA',
  FALHA_INESPERADA: 'FALHA_INESPERADA',
} as const;

export type CodigoErro = (typeof CODIGO_ERRO)[keyof typeof CODIGO_ERRO];

/**
 * Erro de domínio.
 *
 * `mensagem` é para quem vai agir: diz o que corrigir, em português, e
 * NUNCA carrega nome de pessoa (CLAUDE.md, Segurança). Identifique por id.
 */
export interface ErroDeDominio {
  readonly tipo: 'dominio';
  readonly codigo: CodigoErro;
  readonly mensagem: string;
}

export interface ErroDeEntrada {
  readonly tipo: 'entrada';
  readonly codigo: CodigoErro;
  readonly mensagem: string;
  /** Campo do formulário, para a interface destacar. Nunca o valor digitado. */
  readonly campo?: string;
}

export interface ErroDeAcesso {
  readonly tipo: 'acesso';
  readonly codigo: typeof CODIGO_ERRO.SEM_PERMISSAO | typeof CODIGO_ERRO.NAO_ENCONTRADO;
  readonly mensagem: string;
}

export type ErroConhecido = ErroDeDominio | ErroDeEntrada | ErroDeAcesso;

export function erroDeDominio(codigo: CodigoErro, mensagem: string): ErroDeDominio {
  return { tipo: 'dominio', codigo, mensagem };
}

export function erroDeEntrada(
  codigo: CodigoErro,
  mensagem: string,
  campo?: string,
): ErroDeEntrada {
  return campo === undefined
    ? { tipo: 'entrada', codigo, mensagem }
    : { tipo: 'entrada', codigo, mensagem, campo };
}

export function erroDeAcesso(
  codigo: ErroDeAcesso['codigo'],
  mensagem: string,
): ErroDeAcesso {
  return { tipo: 'acesso', codigo, mensagem };
}

/**
 * Falha inesperada que chegou à borda.
 *
 * O detalhe técnico fica no log, ligado pelo identificador de correlação; o
 * usuário recebe só a mensagem e o código curto para citar no suporte.
 * CLAUDE.md, Segurança: erro nunca vaza rastro de pilha nem nome de pessoa.
 *
 * Existe aqui, e não em cada módulo, porque duas frentes já a tinham declarado
 * localmente por não poderem tocar em `shared/`.
 */
export function erroInesperado(correlacaoId: string): ErroDeDominio {
  return {
    tipo: 'dominio',
    codigo: CODIGO_ERRO.FALHA_INESPERADA,
    mensagem: `Não foi possível concluir. Tente de novo; se continuar, cite o código ${correlacaoId.slice(0, 8)}.`,
  };
}
