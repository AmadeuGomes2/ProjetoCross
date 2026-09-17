/**
 * Acesso ao banco do módulo `equipamento`. Possui `equipamento` e
 * `passagem_equipamento`. Toda consulta filtra por obra.
 *
 * ## Assíncrono desde 17/09/2026
 *
 * Mesma conversão de `pessoal`: o Postgres não tem `.run()`, `.get()` nem
 * `.all()`, que eram do `better-sqlite3`. O construtor de consulta do Drizzle é
 * `thenable`, então `await` é o que executa; onde havia `.get()` entra
 * `limit(1)` mais a primeira linha, que diz no SQL o que antes ficava
 * subentendido no dialeto.
 *
 * `entrada` e `saida` são `DATE` agora, e não `TEXT`: a leitura continua
 * devolvendo `AAAA-MM-DD`, e o `ORDER BY` passou a ser de calendário.
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

const CAMPOS_DO_EQUIPAMENTO = {
  id: equipamento.id,
  identificador: equipamento.identificador,
  tipoEquipamentoId: equipamento.tipoEquipamentoId,
} as const;

export async function insereEquipamento(
  db: BancoRdo,
  dados: {
    readonly id: EquipamentoId;
    readonly obraId: ObraId;
    readonly identificador: string;
    readonly tipoEquipamentoId: TipoEquipamentoId;
    readonly criadoPor: UsuarioId;
    readonly criadoEm: Instante;
  },
): Promise<void> {
  await db.insert(equipamento).values(dados);
}

export async function buscaEquipamento(
  db: BancoRdo,
  obraId: ObraId,
  equipamentoId: EquipamentoId,
): Promise<LinhaDeEquipamento | null> {
  const [linha] = await db
    .select(CAMPOS_DO_EQUIPAMENTO)
    .from(equipamento)
    .where(and(eq(equipamento.obraId, obraId), eq(equipamento.id, equipamentoId)))
    .limit(1);
  return linha ?? null;
}

/**
 * Unicidade do identificador **dentro da obra** (R2, CT-042).
 *
 * Identificador duplicado gera duas colunas iguais no bloco 6 e o fiscal não
 * sabe qual é qual. O `UNIQUE (obra_id, identificador)` do banco é a rede;
 * esta consulta é o que produz a mensagem em português.
 */
export async function buscaPorIdentificador(
  db: BancoRdo,
  obraId: ObraId,
  identificador: string,
): Promise<LinhaDeEquipamento | null> {
  const [linha] = await db
    .select(CAMPOS_DO_EQUIPAMENTO)
    .from(equipamento)
    .where(
      and(eq(equipamento.obraId, obraId), eq(equipamento.identificador, identificador)),
    )
    .limit(1);
  return linha ?? null;
}

export interface LinhaDePassagemDeEquipamento {
  readonly id: PassagemEquipamentoId;
  readonly equipamentoId: EquipamentoId;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

const CAMPOS_DA_PASSAGEM = {
  id: passagemEquipamento.id,
  equipamentoId: passagemEquipamento.equipamentoId,
  entrada: passagemEquipamento.entrada,
  saida: passagemEquipamento.saida,
} as const;

export async function inserePassagem(
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
): Promise<void> {
  await db.insert(passagemEquipamento).values(dados);
}

export async function listaPassagensDoEquipamento(
  db: BancoRdo,
  obraId: ObraId,
  equipamentoId: EquipamentoId,
): Promise<LinhaDePassagemDeEquipamento[]> {
  return await db
    .select(CAMPOS_DA_PASSAGEM)
    .from(passagemEquipamento)
    .where(
      and(
        eq(passagemEquipamento.obraId, obraId),
        eq(passagemEquipamento.equipamentoId, equipamentoId),
      ),
    )
    .orderBy(asc(passagemEquipamento.entrada));
}

export async function buscaPassagem(
  db: BancoRdo,
  obraId: ObraId,
  passagemId: PassagemEquipamentoId,
): Promise<LinhaDePassagemDeEquipamento | null> {
  const [linha] = await db
    .select(CAMPOS_DA_PASSAGEM)
    .from(passagemEquipamento)
    .where(
      and(eq(passagemEquipamento.obraId, obraId), eq(passagemEquipamento.id, passagemId)),
    )
    .limit(1);
  return linha ?? null;
}

export async function atualizaSaida(
  db: BancoRdo,
  obraId: ObraId,
  passagemId: PassagemEquipamentoId,
  saida: DiaPuro,
): Promise<void> {
  await db
    .update(passagemEquipamento)
    .set({ saida })
    .where(
      and(eq(passagemEquipamento.obraId, obraId), eq(passagemEquipamento.id, passagemId)),
    );
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
 *
 * **Uma consulta só**: o `innerJoin` já traz o identificador, que é o que o
 * bloco 6 imprime. Este é caminho quente do RDO.
 */
export async function listaPassagensDaObra(
  db: BancoRdo,
  obraId: ObraId,
): Promise<LinhaDeEfetivoDeEquipamento[]> {
  return await db
    .select({
      equipamentoId: passagemEquipamento.equipamentoId,
      identificador: equipamento.identificador,
      entrada: passagemEquipamento.entrada,
      saida: passagemEquipamento.saida,
    })
    .from(passagemEquipamento)
    .innerJoin(equipamento, eq(equipamento.id, passagemEquipamento.equipamentoId))
    .where(eq(passagemEquipamento.obraId, obraId));
}

export interface LinhaDeEquipamentoComTipo {
  readonly id: EquipamentoId;
  readonly identificador: string;
  readonly tipoId: TipoEquipamentoId;
  readonly tipoTermo: string;
}

export async function listaEquipamentosComTipo(
  db: BancoRdo,
  obraId: ObraId,
): Promise<LinhaDeEquipamentoComTipo[]> {
  return await db
    .select({
      id: equipamento.id,
      identificador: equipamento.identificador,
      tipoId: equipamento.tipoEquipamentoId,
      tipoTermo: tipoEquipamento.termo,
    })
    .from(equipamento)
    .innerJoin(tipoEquipamento, eq(tipoEquipamento.id, equipamento.tipoEquipamentoId))
    .where(eq(equipamento.obraId, obraId))
    .orderBy(asc(equipamento.identificador));
}

export async function listaTodasAsPassagens(
  db: BancoRdo,
  obraId: ObraId,
): Promise<LinhaDePassagemDeEquipamento[]> {
  return await db
    .select(CAMPOS_DA_PASSAGEM)
    .from(passagemEquipamento)
    .where(eq(passagemEquipamento.obraId, obraId))
    .orderBy(asc(passagemEquipamento.entrada));
}
