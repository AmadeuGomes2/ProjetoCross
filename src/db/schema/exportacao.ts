/**
 * `registro_exportacao` — a trilha de quem exportou o quê (R20).
 *
 * docs/arquitetura/v1.md, 2.22. CLAUDE.md, Segurança: "Exportação é ato
 * registrado: quem, quando, qual obra, qual período."
 *
 * A linha é gravada **antes** de entregar o arquivo, e nunca é apagada nem
 * atualizada. Identifica o autor por `usuario_id`, **nunca por nome**.
 *
 * Exportação de período grava **uma linha por dia**, amarradas por `lote_id`.
 */

import { desc, sql } from 'drizzle-orm';
import { check, index, pgTable, text } from 'drizzle-orm/pg-core';

import type { ObraId, RegistroExportacaoId, UsuarioId } from '../../shared/id';
import { checkInstante, colunaDia, colunaInstante } from './convencoes';
import { obra } from './obra';
import { usuario } from './usuario';

export const registroExportacao = pgTable(
  'registro_exportacao',
  {
    id: text('id').$type<RegistroExportacaoId>().primaryKey(),
    obraId: text('obra_id')
      .$type<ObraId>()
      .notNull()
      .references(() => obra.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    usuarioId: text('usuario_id')
      .$type<UsuarioId>()
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    momento: colunaInstante('momento'),
    /** O dia do RDO exportado, não o dia em que se exportou. */
    dataRdo: colunaDia('data_rdo'),
    formato: text('formato').$type<'PDF' | 'XLSX'>().notNull(),
    /**
     * Reúne as linhas de uma exportação de período (17/09/2026).
     *
     * **Uma linha por dia**, e não `data_inicial`/`data_final`: o pedido pode
     * ser um conjunto não contíguo, e um par de datas transformaria
     * {02, 05, 09} em "02 a 09" — a auditoria leria oito dias onde houve três.
     *
     * Nulo nas linhas anteriores a esta migration, que eram de um dia só.
     * Inventar um lote para elas afirmaria um agrupamento que nunca existiu.
     */
    loteId: text('lote_id'),
  },
  (t) => [
    index('idx_exportacao').on(t.obraId, desc(t.momento)),
    index('idx_exportacao_lote').on(t.loteId),
    // O fiscal recebe PDF; o Excel entrou em 17/09/2026, para quem soma.
    check('ck_exportacao_formato', sql`${t.formato} IN ('PDF', 'XLSX')`),
    checkInstante('ck_exportacao_momento', t.momento),
  ],
);
