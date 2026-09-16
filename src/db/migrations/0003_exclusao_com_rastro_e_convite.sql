-- Duas decisões de 16/09/2026, numa migration só.
--
-- **30.1 — excluir lançamento deixa rastro.** O engenheiro exclui qualquer
-- lançamento, de qualquer autor, inclusive em dia fechado. O que não muda é o
-- registro: o RDO é documento contratual, e alteração sem rastro deixa duas
-- versões do mesmo dia circulando sem ninguém saber qual vale. Por isso
-- **excluir não apaga linha**: as quatro tabelas de lançamento ganham quem
-- excluiu (id, nunca nome), quando, em UTC, e o motivo em texto livre.
-- O CHECK amarra os três: `excluido_em` gravado sem motivo é rastro pela
-- metade, e rastro pela metade não responde, meses depois, por que o número
-- mudou.
--
-- **34.1 — convite de engenheiro.** `convite` nasceu com
-- `CHECK (perfil = 'encarregado')`, e a consequência era que a saída do
-- engenheiro travava o cadastro da obra: só o comando no servidor criava outro
-- (25.1). O CHECK passa a aceitar os dois perfis.
--
-- ## Por que é uma migration só
--
-- As duas mudanças foram abertas em frentes separadas, e duas migrations `0003`
-- em paralelo colidem no mesmo número e no mesmo journal. Uma só, com as duas
-- partes separadas abaixo, é o que evita a colisão.
--
-- ## Por que escrita à mão
--
-- Pelo mesmo motivo de `0002_funcao_na_passagem.sql`, e a migration gerada foi
-- conferida antes de ser descartada: para uma coluna com CHECK o `drizzle-kit`
-- propõe **recriar as quatro tabelas de lançamento**, com `DROP TABLE` e
-- `PRAGMA foreign_keys=OFF` — que o SQLite ignora dentro da transação em que o
-- migrator do Drizzle roda tudo. Pior: `lancamento_*` tem chave estrangeira
-- para si mesma (`retifica_id`), então o DELETE implícito do `DROP TABLE`
-- esbarra no próprio RESTRICT assim que existir uma retificação.
--
-- Nada disso é necessário. `ALTER TABLE ADD COLUMN` chega ao mesmo esquema sem
-- tocar em linha nenhuma: as três colunas são anuláveis, e a regra do SQLite —
-- `REFERENCES` só com padrão nulo, `NOT NULL` só com padrão não nulo — não é
-- ferida porque o padrão é nulo. O CHECK do trio vai junto da **terceira**
-- coluna, que é quando as outras duas já existem para ser citadas.
--
-- `convite` é o único caso que exige recriação, porque o SQLite não derruba
-- CHECK por `ALTER`. É seguro: **nada referencia `convite`**. A ordem é a mesma
-- que funcionou na 0002 — renomear, criar ao lado, copiar, e só então derrubar
-- a antiga —, e dispensa qualquer PRAGMA.

-- ---------------------------------------------------------------- parte 1
-- Exclusão com rastro nas quatro tabelas de lançamento (30.1).

ALTER TABLE `lancamento_atividade` ADD `excluido_por` text REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `lancamento_atividade` ADD `excluido_em` text CONSTRAINT "ck_atividade_excluido_em" CHECK(`excluido_em` IS NULL OR `excluido_em` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z');--> statement-breakpoint
ALTER TABLE `lancamento_atividade` ADD `motivo_exclusao` text CONSTRAINT "ck_atividade_exclusao" CHECK((`excluido_em` IS NULL AND `excluido_por` IS NULL AND `motivo_exclusao` IS NULL)
       OR (`excluido_em` IS NOT NULL AND `excluido_por` IS NOT NULL AND `motivo_exclusao` IS NOT NULL AND length(trim(`motivo_exclusao`)) > 0));--> statement-breakpoint

ALTER TABLE `lancamento_producao` ADD `excluido_por` text REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `lancamento_producao` ADD `excluido_em` text CONSTRAINT "ck_producao_excluido_em" CHECK(`excluido_em` IS NULL OR `excluido_em` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z');--> statement-breakpoint
ALTER TABLE `lancamento_producao` ADD `motivo_exclusao` text CONSTRAINT "ck_producao_exclusao" CHECK((`excluido_em` IS NULL AND `excluido_por` IS NULL AND `motivo_exclusao` IS NULL)
       OR (`excluido_em` IS NOT NULL AND `excluido_por` IS NOT NULL AND `motivo_exclusao` IS NOT NULL AND length(trim(`motivo_exclusao`)) > 0));--> statement-breakpoint

ALTER TABLE `lancamento_pluviometria` ADD `excluido_por` text REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `lancamento_pluviometria` ADD `excluido_em` text CONSTRAINT "ck_pluviometria_excluido_em" CHECK(`excluido_em` IS NULL OR `excluido_em` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z');--> statement-breakpoint
ALTER TABLE `lancamento_pluviometria` ADD `motivo_exclusao` text CONSTRAINT "ck_pluviometria_exclusao" CHECK((`excluido_em` IS NULL AND `excluido_por` IS NULL AND `motivo_exclusao` IS NULL)
       OR (`excluido_em` IS NOT NULL AND `excluido_por` IS NOT NULL AND `motivo_exclusao` IS NOT NULL AND length(trim(`motivo_exclusao`)) > 0));--> statement-breakpoint

ALTER TABLE `lancamento_observacao` ADD `excluido_por` text REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict;--> statement-breakpoint
ALTER TABLE `lancamento_observacao` ADD `excluido_em` text CONSTRAINT "ck_observacao_excluido_em" CHECK(`excluido_em` IS NULL OR `excluido_em` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z');--> statement-breakpoint
ALTER TABLE `lancamento_observacao` ADD `motivo_exclusao` text CONSTRAINT "ck_observacao_exclusao" CHECK((`excluido_em` IS NULL AND `excluido_por` IS NULL AND `motivo_exclusao` IS NULL)
       OR (`excluido_em` IS NOT NULL AND `excluido_por` IS NOT NULL AND `motivo_exclusao` IS NOT NULL AND length(trim(`motivo_exclusao`)) > 0));--> statement-breakpoint

-- O índice de UMA cadeia de pluviometria por dia passa a ignorar a excluída.
-- Sem isto, excluir a leitura errada trancaria o dia para sempre: o índice
-- recusaria a leitura certa, e o bloco 9 ficaria com o número que foi excluído
-- ou com nada. Índice parcial se troca por DROP e CREATE; a tabela não é tocada.
DROP INDEX `ux_pluviometria_dia`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_pluviometria_dia` ON `lancamento_pluviometria` (`obra_id`,`data`) WHERE "lancamento_pluviometria"."retifica_id" IS NULL AND "lancamento_pluviometria"."excluido_em" IS NULL;--> statement-breakpoint

-- ---------------------------------------------------------------- parte 2
-- O CHECK de `convite` aceita os dois perfis (34.1).

ALTER TABLE `convite` RENAME TO `convite_antiga`;--> statement-breakpoint
DROP INDEX `ux_convite_token`;--> statement-breakpoint
CREATE TABLE `convite` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`perfil` text NOT NULL,
	`criado_por` text NOT NULL,
	`criado_em` text NOT NULL,
	`expira_em` text NOT NULL,
	`usado_por` text,
	`usado_em` text,
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`criado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`usado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_convite_perfil" CHECK("convite"."perfil" IN ('engenheiro', 'encarregado')),
	CONSTRAINT "ck_convite_criado_em" CHECK("convite"."criado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_convite_expira_em" CHECK("convite"."expira_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_convite_usado_em" CHECK("convite"."usado_em" IS NULL OR "convite"."usado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_convite_token` ON `convite` (`token_hash`);--> statement-breakpoint
INSERT INTO `convite` ("id", "obra_id", "token_hash", "perfil", "criado_por", "criado_em", "expira_em", "usado_por", "usado_em") SELECT "id", "obra_id", "token_hash", "perfil", "criado_por", "criado_em", "expira_em", "usado_por", "usado_em" FROM `convite_antiga`;--> statement-breakpoint
DROP TABLE `convite_antiga`;
