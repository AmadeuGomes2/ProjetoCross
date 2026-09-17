-- Exportação de período e em Excel (decisões de 17/09/2026).
--
-- `registro_exportacao` nasceu com `CHECK (formato = 'PDF')` e uma coluna
-- `data_rdo` só, porque na v1 exportava-se um dia por vez e o fiscal recebia
-- PDF. As duas premissas caíram: o engenheiro passa a exportar **um conjunto de
-- dias** — semana, mês, intervalo ou dias avulsos não contíguos — e **em
-- Excel**.
--
-- A trilha continua sendo o que CLAUDE.md, Segurança, exige: "quem, quando,
-- qual obra, qual período". Duas mudanças, e nenhuma linha existente se perde.
--
-- ## Uma linha por dia, amarradas por `lote_id`
--
-- A alternativa era guardar o período como `data_inicial` e `data_final`. Ela
-- foi recusada porque **mente sobre um conjunto não contíguo**: exportar
-- {02, 05, 09} viraria "02 a 09" na trilha, e a auditoria leria oito dias onde
-- houve três. Uma linha por dia diz a verdade, e `lote_id` — nulo nas linhas
-- antigas, que eram de um dia só — reúne as linhas da mesma exportação.
--
-- ## Por que escrita à mão
--
-- Mesmo motivo de `0002` e `0003`. O SQLite não altera CHECK: para trocar
-- `formato = 'PDF'` por `formato IN ('PDF','XLSX')` é preciso recriar a tabela,
-- e a recriação gerada pelo `drizzle-kit` traz `PRAGMA foreign_keys=OFF`, que o
-- SQLite ignora dentro da transação em que o migrator roda tudo.
--
-- Aqui a recriação é segura, e é por uma razão específica:
-- `registro_exportacao` é **folha**. Ninguém a referencia, ela referencia
-- `obra` e `usuario`. O `DROP TABLE` da cópia velha não dispara RESTRICT
-- nenhum, ao contrário de `lancamento_*`, que aponta para si mesma.
--
-- `lote_id` é anulável de propósito: linha antiga é exportação de um dia só, e
-- inventar um lote para ela seria afirmar um agrupamento que nunca existiu.

ALTER TABLE `registro_exportacao` RENAME TO `registro_exportacao_antiga`;--> statement-breakpoint
DROP INDEX `idx_exportacao`;--> statement-breakpoint
CREATE TABLE `registro_exportacao` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`usuario_id` text NOT NULL,
	`momento` text NOT NULL,
	`data_rdo` text NOT NULL,
	`formato` text NOT NULL,
	`lote_id` text,
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_exportacao_formato" CHECK("registro_exportacao"."formato" IN ('PDF', 'XLSX')),
	CONSTRAINT "ck_exportacao_data_rdo" CHECK("registro_exportacao"."data_rdo" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "ck_exportacao_momento" CHECK("registro_exportacao"."momento" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE INDEX `idx_exportacao` ON `registro_exportacao` (`obra_id`,`momento` desc);--> statement-breakpoint
CREATE INDEX `idx_exportacao_lote` ON `registro_exportacao` (`lote_id`);--> statement-breakpoint
INSERT INTO `registro_exportacao` ("id", "obra_id", "usuario_id", "momento", "data_rdo", "formato", "lote_id") SELECT "id", "obra_id", "usuario_id", "momento", "data_rdo", "formato", NULL FROM `registro_exportacao_antiga`;--> statement-breakpoint
DROP TABLE `registro_exportacao_antiga`;
