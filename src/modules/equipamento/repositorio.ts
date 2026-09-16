/**
 * Acesso ao banco do módulo `equipamento`. Possui `equipamento` e
 * `passagem_equipamento`. Toda consulta filtra por obra.
 */

import { and, asc, eq } from 'drizzle-orm';

import type { BancoRdo } from '../../db';
import { equipamento, passagemEquipamento, tipoEquipamento } from '../../db/schema';
import type { DiaPuro } from '../../shared/date/dia';
import type { Instante } from '../../shared/date/fuso';
import type {
  EquipamentoId,
  ObraId,
  PassagemEquipamentoId,
  TipoEquipamentoId,
  UsuarioId,
} from '../../shared/id';

export interface LinhaDeEquipamento {
  readonly id: EquipamentoId;
  readonly identificador: string;
  readonly tipoEquipamentoId: TipoEquipamentoId;
}

export function insereEquipamento(
  db: BancoRdo,
  dados: {
    readonly id: EquipamentoId;
    readonly obraId: ObraId;
    readonly identificador: string;
    readonly tipoEquipamentoId: TipoEquipamentoId;
    readonly criadoPor: UsuarioId;
    readonly criadoEm: Instante;
  },
): void {
  db.insert(equipamento).values(dados).run();
}

export function buscaEquipamento(
  db: BancoRdo,
  obraId: ObraId,
  equipamentoId: EquipamentoId,
): LinhaDeEquipamento | null {
  return (
    db
      .select({
        id: equipamento.id,
        identificador: equipamento.identificador,
        tipoEquipamentoId: equipamento.tipoEquipamentoId,
      })
      .from(equipamento)
      .where(and(eq(equipamento.obraId, obraId), eq(equipamento.id, equipamentoId)))
      .get() ?? null
  );
}

/**
 * Unicidade do identificador **dentro da obra** (R2, CT-042).
 *
 * Identificador duplicado gera duas colunas iguais no bloco 6 e o fiscal não
 * sabe qual é qual. O `UNIQUE (obra_id, identificador)` do banco é a rede;
 * esta consulta é o que produz a mensagem em português.
 */
export function buscaPorIdentificador(
  db: BancoRdo,
  obraId: ObraId,
  identificador: string,
): LinhaDeEquipamento | null {
  return (
    db
      .select({
        id: equipamento.id,
        identificador: equipamento.identificador,
        tipoEquipamentoId: equipamento.tipoEquipamentoId,
      })
      .from(equipamento)
      .where(
        and(eq(equipamento.obraId, obraId), eq(equipamento.identificador, identificador)),
      )
      .get() ?? null
  );
}

export interface LinhaDePassagemDeEquipamento {
  readonly id: PassagemEquipamentoId;
  readonly equipamentoId: EquipamentoId;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

export function inserePassagem(
  db: BancoRdo,
  dados: {
    readonly id: PassagemEquipamentoId;
    readonly obraId: ObraId;
    readonly equipamentoId: EquipamentoId;
    readonly entrada: DiaPuro;
    readonly saida: DiaPuro | null;
    readonly registradoPor: UsuarioId;
    readonly registradoEm: Instante;
  },
): void {
  db.insert(passagemEquipamento).values(dados).run();
}

export function listaPassagensDoEquipamento(
  db: BancoRdo,
  obraId: ObraId,
  equipamentoId: EquipamentoId,
): LinhaDePassagemDeEquipamento[] {
  return db
    .select({
      id: passagemEquipamento.id,
      equipamentoId: passagemEquipamento.equipamentoId,
      entrada: passagemEquipamento.entrada,
      saida: passagemEquipamento.saida,
    })
    .from(passagemEquipamento)
    .where(
      and(
        eq(passagemEquipamento.obraId, obraId),
        eq(passagemEquipamento.equipamentoId, equipamentoId),
      ),
    )
    .orderBy(asc(passagemEquipamento.entrada))
    .all();
}

export function buscaPassagem(
  db: BancoRdo,
  obraId: ObraId,
  passagemId: PassagemEquipamentoId,
): LinhaDePassagemDeEquipamento | null {
  return (
    db
      .select({
        id: passagemEquipamento.id,
        equipamentoId: passagemEquipamento.equipamentoId,
        entrada: passagemEquipamento.entrada,
        saida: passagemEquipamento.saida,
      })
      .from(passagemEquipamento)
      .where(
        and(
          eq(passagemEquipamento.obraId, obraId),
          eq(passagemEquipamento.id, passagemId),
        ),
      )
      .get() ?? null
  );
}

export function atualizaSaida(
  db: BancoRdo,
  obraId: ObraId,
  passagemId: PassagemEquipamentoId,
  saida: DiaPuro,
): void {
  db.update(passagemEquipamento)
    .set({ saida })
    .where(
      and(eq(passagemEquipamento.obraId, obraId), eq(passagemEquipamento.id, passagemId)),
    )
    .run();
}

export interface LinhaDeEfetivoDeEquipamento {
  readonly equipamentoId: EquipamentoId;
  readonly identificador: string;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

/**
 * Todas as passagens da obra. Sem filtro de data em SQL: quem decide se a
 * passagem cobre o dia é `intervaloCobreODia`, e a regra tem uma implementação
 * só no sistema (decisão 1.2 igualou pessoa e equipamento).
 */
export function listaPassagensDaObra(
  db: BancoRdo,
  obraId: ObraId,
): LinhaDeEfetivoDeEquipamento[] {
  return db
    .select({
      equipamentoId: passagemEquipamento.equipamentoId,
      identificador: equipamento.identificador,
      entrada: passagemEquipamento.entrada,
      saida: passagemEquipamento.saida,
    })
    .from(passagemEquipamento)
    .innerJoin(equipamento, eq(equipamento.id, passagemEquipamento.equipamentoId))
    .where(eq(passagemEquipamento.obraId, obraId))
    .all();
}

export interface LinhaDeEquipamentoComTipo {
  readonly id: EquipamentoId;
  readonly identificador: string;
  readonly tipoId: TipoEquipamentoId;
  readonly tipoTermo: string;
}

export function listaEquipamentosComTipo(
  db: BancoRdo,
  obraId: ObraId,
): LinhaDeEquipamentoComTipo[] {
  return db
    .select({
      id: equipamento.id,
      identificador: equipamento.identificador,
      tipoId: equipamento.tipoEquipamentoId,
      tipoTermo: tipoEquipamento.termo,
    })
    .from(equipamento)
    .innerJoin(tipoEquipamento, eq(tipoEquipamento.id, equipamento.tipoEquipamentoId))
    .where(eq(equipamento.obraId, obraId))
    .orderBy(asc(equipamento.identificador))
    .all();
}

export function listaTodasAsPassagens(
  db: BancoRdo,
  obraId: ObraId,
): LinhaDePassagemDeEquipamento[] {
  return db
    .select({
      id: passagemEquipamento.id,
      equipamentoId: passagemEquipamento.equipamentoId,
      entrada: passagemEquipamento.entrada,
      saida: passagemEquipamento.saida,
    })
    .from(passagemEquipamento)
    .where(eq(passagemEquipamento.obraId, obraId))
    .orderBy(asc(passagemEquipamento.entrada))
    .all();
}
