/**
 * Log.
 *
 * CLAUDE.md, Segurança: "Erro nunca vaza nome de pessoa. Nem em log, nem em
 * mensagem, nem em URL, nem em metadado. Identifique por id, não por nome."
 *
 * A defesa aqui é o TIPO, não a disciplina de quem escreve:
 *
 *   registra('X', { obraId })      compila
 *   registra('X', { nome: 'ana' }) NÃO compila
 *
 * `ContextoDeLog` só tem campos de identificador e de contagem. Não existe
 * campo de texto livre, e é de propósito: o texto livre do domínio (descrição
 * de atividade, motivo de parada, observação) pode conter nome de trabalhador
 * ou de fiscal, e a planilha real prova que contém.
 */

import type {
  CorrelacaoId,
  DiaDeObraId,
  EquipamentoId,
  LancamentoId,
  ObraId,
  PessoaId,
  ServicoControladoId,
  UsuarioId,
} from '../id';
import type { CodigoErro } from '../result';

/**
 * Tudo que pode ser registrado. Nenhum campo aceita nome, descrição ou
 * qualquer texto vindo de pessoa.
 */
export interface ContextoDeLog {
  readonly obraId?: ObraId;
  readonly usuarioId?: UsuarioId;
  readonly pessoaId?: PessoaId;
  readonly equipamentoId?: EquipamentoId;
  readonly servicoId?: ServicoControladoId;
  readonly diaId?: DiaDeObraId;
  readonly lancamentoId?: LancamentoId;
  /** Dia de obra no formato AAAA-MM-DD. Não é dado pessoal. */
  readonly dia?: string;
  readonly perfil?: 'engenheiro' | 'encarregado';
  readonly codigo?: CodigoErro;
  readonly quantidade?: number;
  readonly duracaoMs?: number;
}

export type NivelDeLog = 'debug' | 'info' | 'aviso' | 'erro';

export interface EventoDeLog {
  readonly nivel: NivelDeLog;
  readonly correlacaoId: CorrelacaoId;
  readonly evento: string;
  readonly contexto: ContextoDeLog;
  readonly em: string;
}

export type Escritor = (evento: EventoDeLog) => void;

// Só `console.error` e `console.warn`, que é o que a regra do projeto permite.
// `console.log` é proibido: vira log de produção sem passar por este tipo.
const escritorPadrao: Escritor = (evento) => {
  const linha = JSON.stringify(evento);
  if (evento.nivel === 'erro') console.error(linha);
  else console.warn(linha);
};

let escritorAtual: Escritor = escritorPadrao;

/** Para teste: troca o destino sem tocar em quem chama `registra`. */
export function defineEscritor(escritor: Escritor): void {
  escritorAtual = escritor;
}

export function restauraEscritorPadrao(): void {
  escritorAtual = escritorPadrao;
}

export function registra(
  nivel: NivelDeLog,
  correlacaoId: CorrelacaoId,
  evento: string,
  contexto: ContextoDeLog = {},
): void {
  escritorAtual({
    nivel,
    correlacaoId,
    evento,
    contexto,
    em: new Date().toISOString(),
  });
}

/**
 * Mensagem genérica para o usuário quando algo inesperado acontece.
 *
 * O detalhe técnico fica no log, ligado por este identificador. O usuário
 * recebe o identificador para citar no suporte, e nunca o rastro de pilha.
 */
export function mensagemGenericaDeErro(correlacaoId: CorrelacaoId): string {
  return `Não foi possível concluir. Tente de novo; se continuar, cite o código ${correlacaoId.slice(0, 8)}.`;
}
