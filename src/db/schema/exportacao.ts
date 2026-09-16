/**
 * `registro_exportacao` — a trilha de quem exportou o quê (R20).
 *
 * docs/arquitetura/v1.md, 2.22. CLAUDE.md, Segurança: "Exportação é ato
 * registrado: quem, quando, qual obra, qual período."
 *
 * A linha é gravada **antes** de entregar o arquivo, e nunca é apagada nem
 * atualizada. Identifica o autor por `usuario_id`, **nunca por nome**.
 */

import { desc, sql } from 'drizzle-orm';
import { check, index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { ObraId, RegistroExportacaoId, UsuarioId } from '../../shared/id';
import { checkDia, checkInstante, colunaDia, colunaInstante } from './convencoes';
import { obra } from './obra';
import { usuario } from './usuario';

export const registroExportacao = sqliteTable(
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
    formato: text('formato').$type<'PDF'>().notNull(),
  },
  (t) => [
    index('idx_exportacao').on(t.obraId, desc(t.momento)),
    // Na v1 o fiscal recebe PDF. Exportação em Excel está fora do escopo.
    check('ck_exportacao_formato', sql`${t.formato} = 'PDF'`),
    checkDia('ck_exportacao_data_rdo', t.dataRdo),
    checkInstante('ck_exportacao_momento', t.momento),
  ],
);
