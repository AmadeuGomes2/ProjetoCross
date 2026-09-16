/**
 * Comandos do módulo `lancamento`, já validados.
 *
 * Arquitetura 5.1: "o esquema não devolve `string`: ele transforma para os
 * tipos de marca de `shared`. Consequência: a assinatura do caso de uso não
 * aceita entrada crua, e esquecer a validação não compila."
 *
 * Por isso aqui só há `DiaPuro`, `Quantidade`, `ObraId` e uniões literais. O
 * texto livre (descrição, motivo, observação) chega recortado nas pontas e já
 * conferido como não vazio.
 */

import type { DiaPuro } from '../../shared/date/dia';
import type { Quantidade } from '../../shared/decimal';
import type {
  LancamentoId,
  ObraId,
  ServicoControladoId,
  StatusAtividadeId,
} from '../../shared/id';
import type { LetraDeTurno } from '../../shared/taxonomia';
import type { TipoDeLancamento } from './tipos';

/**
 * Referência ao status.
 *
 * A tela manda o id, escolhido de lista. O rascunho offline e a integração
 * mandam o termo, e é aí que vale a comparação insensível a caixa e a espaços
 * das pontas (R13). Em nenhum dos dois caminhos se cria termo novo.
 */
export type ReferenciaDeStatus =
  | { readonly tipo: 'id'; readonly id: StatusAtividadeId }
  | { readonly tipo: 'termo'; readonly termo: string };

export type ReferenciaDeServico =
  | { readonly tipo: 'id'; readonly id: ServicoControladoId }
  | { readonly tipo: 'nome'; readonly nome: string };

/**
 * Estado do dia.
 *
 * O tipo do dia trabalhado NÃO TEM campo de motivo, e o do dia parado exige o
 * motivo: `padroes-codigo`, Tipos — "modele o impossível fora do tipo". Assim o
 * motivo não fica pendurado num dia trabalhado e não vaza para a primeira linha
 * do bloco 8.
 */
export type ComandoEstadoDoDia =
  | {
      readonly obraId: ObraId;
      readonly data: DiaPuro;
      readonly estado: 'trabalhado';
    }
  | {
      readonly obraId: ObraId;
      readonly data: DiaPuro;
      readonly estado: 'parado';
      readonly motivoParada: string;
    };

export interface Turnos {
  readonly noiteAnterior: LetraDeTurno | null;
  readonly manha: LetraDeTurno | null;
  readonly tarde: LetraDeTurno | null;
}

/** Confirmação de tela: um toque grava o estado do dia e os turnos. */
export type ComandoConfirmarDia = ComandoEstadoDoDia & {
  readonly turnos: Turnos | null;
  readonly indiceMm: Quantidade | null;
};

export interface ComandoAtividade {
  readonly obraId: ObraId;
  readonly data: DiaPuro;
  readonly descricao: string;
  readonly status: ReferenciaDeStatus;
  readonly chaveDeRascunho: string | null;
}

export interface ComandoProducao {
  readonly obraId: ObraId;
  readonly data: DiaPuro;
  readonly servico: ReferenciaDeServico;
  readonly quantidade: Quantidade;
  readonly chaveDeRascunho: string | null;
}

export interface ComandoPluviometria {
  readonly obraId: ObraId;
  readonly data: DiaPuro;
  readonly noiteAnterior: LetraDeTurno | null;
  readonly manha: LetraDeTurno | null;
  readonly tarde: LetraDeTurno | null;
  readonly indiceMm: Quantidade;
  readonly chaveDeRascunho: string | null;
}

/**
 * Observação.
 *
 * Não tem campo `lado`: na v1 só existe o da contratada (10.1). O lado
 * CONTRATANTE é recusado na borda, com a mensagem que explica que o bloco sai
 * vazio — e não chega a existir como comando.
 */
export interface ComandoObservacao {
  readonly obraId: ObraId;
  readonly data: DiaPuro;
  readonly texto: string;
  readonly chaveDeRascunho: string | null;
}

export type ConteudoDeLancamento =
  | {
      readonly tipo: 'atividade';
      readonly descricao: string;
      readonly status: ReferenciaDeStatus;
    }
  | {
      readonly tipo: 'producao';
      readonly servico: ReferenciaDeServico;
      readonly quantidade: Quantidade;
    }
  | {
      readonly tipo: 'pluviometria';
      readonly noiteAnterior: LetraDeTurno | null;
      readonly manha: LetraDeTurno | null;
      readonly tarde: LetraDeTurno | null;
      readonly indiceMm: Quantidade;
    }
  | { readonly tipo: 'observacao'; readonly texto: string };

export interface ComandoCorrigir {
  readonly obraId: ObraId;
  readonly lancamentoId: LancamentoId;
  readonly conteudo: ConteudoDeLancamento;
}

/** Retificar tem a mesma forma de corrigir, e regras opostas: ver 22.1. */
export type ComandoRetificar = ComandoCorrigir;

export interface ComandoExcluir {
  readonly obraId: ObraId;
  readonly lancamentoId: LancamentoId;
  readonly tipo: TipoDeLancamento;
}

export interface ComandoFecharDia {
  readonly obraId: ObraId;
  readonly data: DiaPuro;
}
