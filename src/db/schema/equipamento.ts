/**
 * `equipamento` e `passagem_equipamento`.
 *
 * docs/arquitetura/v1.md, 2.13 e 2.14. Mesmas razões de `pessoal`, com duas
 * diferenças: o bloco 6 do RDO agrega por **identificador** (`CF-29`, `RE-17`),
 * não por tipo (R2), e o identificador é único na obra.
 *
 * A regra do dia da saída é a MESMA de pessoal (decisão 1.2): acabou a
 * divergência da planilha, que tinha três comportamentos diferentes.
 */

import {
  foreignKey,
  index,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import type {
  EquipamentoId,
  ObraId,
  PassagemEquipamentoId,
  TipoEquipamentoId,
} from '../../shared/id';
import {
  checkDia,
  checkDiaOpcional,
  checkInstante,
  checkSaidaNaoAntesDaEntrada,
  checkTextoNaoVazio,
  colunaDia,
  colunaDiaOpcional,
  colunaInstante,
} from './convencoes';
import { obra } from './obra';
import { tipoEquipamento } from './taxonomia';
import { colunaAutor } from './usuario';

export const equipamento = sqliteTable(
  'equipamento',
  {
    id: text('id').$type<EquipamentoId>().primaryKey(),
    obraId: text('obra_id')
      .$type<ObraId>()
      .notNull()
      .references(() => obra.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    /** O que o RDO imprime no bloco 6. Único na obra. */
    identificador: text('identificador').notNull(),
    tipoEquipamentoId: text('tipo_equipamento_id')
      .$type<TipoEquipamentoId>()
      .notNull()
      .references(() => tipoEquipamento.id, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    criadoPor: colunaAutor('criado_por'),
    criadoEm: colunaInstante('criado_em'),
  },
  (t) => [
    uniqueIndex('ux_equipamento_identificador').on(t.obraId, t.identificador),
    // Alvo da FK composta de `passagem_equipamento`.
    uniqueIndex('ux_equipamento_id_obra').on(t.id, t.obraId),
    checkTextoNaoVazio('ck_equipamento_identificador', t.identificador),
    checkInstante('ck_equipamento_criado_em', t.criadoEm),
  ],
);

export const passagemEquipamento = sqliteTable(
  'passagem_equipamento',
  {
    id: text('id').$type<PassagemEquipamentoId>().primaryKey(),
    obraId: text('obra_id').$type<ObraId>().notNull(),
    equipamentoId: text('equipamento_id').$type<EquipamentoId>().notNull(),
    entrada: colunaDia('entrada'),
    saida: colunaDiaOpcional('saida'),
    registradoPor: colunaAutor('registrado_por'),
    registradoEm: colunaInstante('registrado_em'),
  },
  (t) => [
    foreignKey({
      columns: [t.equipamentoId, t.obraId],
      foreignColumns: [equipamento.id, equipamento.obraId],
      name: 'fk_passagem_equipamento_equipamento',
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    index('idx_passagem_equipamento_dia').on(t.obraId, t.entrada, t.saida),
    index('idx_passagem_equipamento_equipamento').on(t.equipamentoId),
    checkDia('ck_passagem_equipamento_entrada', t.entrada),
    checkDiaOpcional('ck_passagem_equipamento_saida', t.saida),
    checkSaidaNaoAntesDaEntrada('ck_passagem_equipamento_intervalo', t.saida, t.entrada),
    checkInstante('ck_passagem_equipamento_registrado_em', t.registradoEm),
  ],
);
