/**
 * `obra` e `periodo_bms` — o cabeçalho do documento e o campo `BM'S`.
 *
 * docs/arquitetura/v1.md, 2.1 e 2.2. A `obra` existe porque os blocos 3, 4 e 11
 * do RDO saem daqui e porque `data_inicio` é o zero do número do RDO (R4,
 * decisão 6.1). O `periodo_bms` existe porque o BMS deixou de ser tabela fixa
 * legada e virou cadastro do engenheiro (7.1), obrigatório na criação da obra
 * (21.1).
 */

import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import type { ObraId, PeriodoBmsId } from '../../shared/id';
import {
  checkDia,
  checkInstante,
  checkTextoNaoVazio,
  colunaDia,
  colunaInstante,
} from './convencoes';
import { colunaAutor } from './usuario';

export const obra = sqliteTable(
  'obra',
  {
    id: text('id').$type<ObraId>().primaryKey(),
    /** Um campo só, não repartido em número e bloco (decisão 8.1). */
    contrato: text('contrato').notNull(),
    contratante: text('contratante').notNull(),
    contratada: text('contratada').notNull(),
    dataInicio: colunaDia('data_inicio'),
    dataTermino: colunaDia('data_termino'),
    escopo: text('escopo').notNull(),
    nomeProjeto: text('nome_projeto').notNull(),
    area: text('area').notNull(),
    local: text('local').notNull(),
    /**
     * Responsável técnico: nome, titulação e CREA moram na obra (decisão 18.1).
     * **Dado pessoal.** Opcional no cadastro e exigido na exportação
     * (arquitetura, pergunta P7), por isso as três colunas aceitam nulo.
     */
    respTecnicoNome: text('resp_tecnico_nome'),
    respTecnicoTitulo: text('resp_tecnico_titulo'),
    respTecnicoCrea: text('resp_tecnico_crea'),
    criadoPor: colunaAutor('criado_por'),
    criadoEm: colunaInstante('criado_em'),
  },
  (t) => [
    checkTextoNaoVazio('ck_obra_contrato', t.contrato),
    checkTextoNaoVazio('ck_obra_contratante', t.contratante),
    checkTextoNaoVazio('ck_obra_contratada', t.contratada),
    checkTextoNaoVazio('ck_obra_escopo', t.escopo),
    checkTextoNaoVazio('ck_obra_nome_projeto', t.nomeProjeto),
    checkTextoNaoVazio('ck_obra_area', t.area),
    checkTextoNaoVazio('ck_obra_local', t.local),
    checkDia('ck_obra_data_inicio', t.dataInicio),
    checkDia('ck_obra_data_termino', t.dataTermino),
    // R14: a planilha tem um período de -716 dias. Caso de teste obrigatório 9.
    // A mensagem em português fica na borda; este CHECK é a rede.
    check('ck_obra_termino_apos_inicio', sql`${t.dataTermino} >= ${t.dataInicio}`),
    checkInstante('ck_obra_criado_em', t.criadoEm),
  ],
);

export const periodoBms = sqliteTable(
  'periodo_bms',
  {
    id: text('id').$type<PeriodoBmsId>().primaryKey(),
    obraId: text('obra_id')
      .$type<ObraId>()
      .notNull()
      .references(() => obra.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    numero: integer('numero').notNull(),
    dataInicial: colunaDia('data_inicial'),
    dataFinal: colunaDia('data_final'),
    criadoPor: colunaAutor('criado_por'),
    criadoEm: colunaInstante('criado_em'),
  },
  (t) => [
    uniqueIndex('ux_periodo_bms_numero').on(t.obraId, t.numero),
    // Consulta do cabeçalho: qual período cobre este dia.
    index('idx_periodo_bms_busca').on(t.obraId, t.dataInicial, t.dataFinal),
    check('ck_periodo_bms_numero', sql`${t.numero} >= 0`),
    checkDia('ck_periodo_bms_data_inicial', t.dataInicial),
    checkDia('ck_periodo_bms_data_final', t.dataFinal),
    // R14 e R25, a mesma validação da obra.
    check('ck_periodo_bms_final_apos_inicial', sql`${t.dataFinal} >= ${t.dataInicial}`),
    checkInstante('ck_periodo_bms_criado_em', t.criadoEm),
  ],
);

// Sobreposição entre períodos da mesma obra NÃO é expressável em CHECK. Fica no
// caso de uso `cadastraPeriodoBms`, com consulta na mesma transação
// (arquitetura, decisão 11 e pergunta P5).
