/**
 * Ponto de entrada do módulo `lancamento`.
 *
 * Duas famílias de operação, de propósito:
 *
 * - `lanca*`, `declara*`, `corrige*`… recebem **comando já validado**, com os
 *   tipos de marca de `shared`. Esquecer a validação não compila.
 * - `recebe*` recebem `unknown` — o que veio do navegador — e passam pelo Zod
 *   da borda antes de chamar o caso de uso. É o que a rota e a Server Action
 *   usam, e o único caminho por onde entrada hostil atravessa.
 *
 * Leitura não tem `recebe*`: quem lê já foi autorizado pela rota.
 */

import type { ErroConhecido, ErroDeEntrada, Result } from '../../shared/result';
import {
  leComandoDeAtividade,
  leComandoDeConfirmacao,
  leComandoDeCorrecao,
  leComandoDeEstadoDoDia,
  leComandoDeExclusao,
  leComandoDeFechamento,
  leComandoDeObservacao,
  leComandoDePluviometria,
  leComandoDeProducao,
} from './borda/esquemas';
import {
  criaCasosDeLancamento as criaNucleo,
  type DependenciasDeLancamento,
} from './casos';
import type { Ator } from './tipos';

async function aplica<C, T>(
  lido: Result<C, ErroDeEntrada>,
  executa: (comando: C) => Promise<Result<T, ErroConhecido>>,
): Promise<Result<T, ErroConhecido>> {
  if (!lido.ok) return lido;
  return executa(lido.valor);
}

export function criaCasosDeLancamento(deps: DependenciasDeLancamento) {
  const nucleo = criaNucleo(deps);
  return {
    ...nucleo,
    recebeEstadoDoDia: (bruto: unknown, ator: Ator) =>
      aplica(leComandoDeEstadoDoDia(bruto), (c) => nucleo.declaraEstadoDoDia(c, ator)),
    recebeConfirmacaoDoDia: (bruto: unknown, ator: Ator) =>
      aplica(leComandoDeConfirmacao(bruto), (c) => nucleo.confirmaDia(c, ator)),
    recebeAtividade: (bruto: unknown, ator: Ator) =>
      aplica(leComandoDeAtividade(bruto), (c) => nucleo.lancaAtividade(c, ator)),
    recebeProducao: (bruto: unknown, ator: Ator) =>
      aplica(leComandoDeProducao(bruto), (c) => nucleo.lancaProducao(c, ator)),
    recebePluviometria: (bruto: unknown, ator: Ator) =>
      aplica(leComandoDePluviometria(bruto), (c) => nucleo.lancaPluviometria(c, ator)),
    recebeObservacao: (bruto: unknown, ator: Ator) =>
      aplica(leComandoDeObservacao(bruto), (c) => nucleo.lancaObservacao(c, ator)),
    recebeCorrecao: (bruto: unknown, ator: Ator) =>
      aplica(leComandoDeCorrecao(bruto), (c) => nucleo.corrigeLancamento(c, ator)),
    recebeExclusao: (bruto: unknown, ator: Ator) =>
      aplica(leComandoDeExclusao(bruto), (c) => nucleo.excluiLancamento(c, ator)),
    recebeFechamento: (bruto: unknown, ator: Ator) =>
      aplica(leComandoDeFechamento(bruto), (c) => nucleo.fechaDia(c, ator)),
    recebeRetificacao: (bruto: unknown, ator: Ator) =>
      aplica(leComandoDeCorrecao(bruto), (c) => nucleo.retificaLancamento(c, ator)),
  };
}

export type CasosDeLancamento = ReturnType<typeof criaCasosDeLancamento>;

export type { DependenciasDeLancamento } from './casos';
export type { RepositorioDeLancamento, Colecao, ColecaoDeProducao } from './repositorio';
export type {
  AcaoProtegida,
  ExigeAcessoNaObra,
  ObtemPeriodoDaObra,
  PeriodoDaObra,
  PortaDeServicosControlados,
  PortaDeStatusDeAtividade,
  PortasDoLancamento,
  ServicoControlado,
  StatusDeAtividade,
} from './portas';
export type {
  AtividadeDoDia,
  Ator,
  AtorNaObra,
  AvisoDeLancamento,
  DiaDeObra,
  EstadoNaTela,
  LancamentoAceito,
  ObservacaoDoDia,
  Perfil,
  PluviometriaDoDia,
  PreenchimentoInicial,
  ProducaoPorServico,
  TipoDeLancamento,
  VersaoDeLancamento,
} from './tipos';
export { SUGESTOES_MOTIVO_PARADA } from '../../shared/taxonomia';
