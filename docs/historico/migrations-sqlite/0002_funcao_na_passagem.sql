-- Decisão 29.1, de 16/09/2026: **função é atributo da passagem, não da pessoa.**
--
-- Com a função em `pessoa`, promover o Motorista a Operador II em setembro
-- reescrevia o efetivo de março: o RDO que o fiscal já recebeu passava a dizer
-- outra coisa, e duas cópias do mesmo dia divergiam sem ninguém saber qual
-- vale. O RDO é documento contratual; o efetivo impresso tem que refletir o que
-- era verdade NAQUELE dia. Trocar de função passa a encerrar a passagem e abrir
-- outra, e o passado fica onde estava.
--
-- A coluna **sai de `pessoa` agora**, e não fica órfã para depois. Ela é
-- `NOT NULL`: deixada lá, todo cadastro novo teria de gravar uma segunda função
-- que ninguém atualiza, e no primeiro `UPDATE` de troca as duas verdades
-- divergiriam — exatamente o defeito que esta decisão existe para matar. Coluna
-- órfã só é barata quando é anulável.
--
-- Escrito à mão, pelo mesmo motivo de `0001_engenheiro_na_conta.sql`, e a
-- migration gerada foi conferida antes de ser descartada: ela falha com
-- `FOREIGN KEY constraint failed`. São quatro problemas somados:
--
--   1. abre com `PRAGMA foreign_keys=OFF`, que o SQLite **ignora** dentro de
--      transação — e o migrator do Drizzle roda tudo entre BEGIN e COMMIT;
--   2. com as chaves ligadas, `DROP TABLE pessoa` faz um DELETE implícito e
--      esbarra no RESTRICT de `passagem_pessoa`, que é filha dela;
--   3. `ALTER TABLE ADD funcao_id text NOT NULL REFERENCES funcao(id)` é
--      inválido no SQLite: `NOT NULL` exige valor padrão não nulo e
--      `REFERENCES` exige padrão nulo;
--   4. e não migra dado nenhum — o efetivo de todo RDO antigo zeraria.
--
-- A ordem abaixo dispensa qualquer PRAGMA. Renomear as duas tabelas primeiro
-- faz o SQLite reapontar sozinho a chave estrangeira da filha para a mãe
-- renomeada; as novas nascem ao lado, recebem o dado e as antigas saem de baixo
-- para cima, filha antes da mãe. Em nenhum instante existe filha órfã.
--
-- **A herança do dado é a linha que não pode faltar:** toda passagem recebe a
-- função que a pessoa tem hoje. Sem esse JOIN, `funcao_id` nasceria nula, a
-- coluna é NOT NULL e a migration falharia; se fosse anulável, o bloco 5 de
-- todo RDO já emitido sairia vazio.
ALTER TABLE `passagem_pessoa` RENAME TO `passagem_pessoa_antiga`;--> statement-breakpoint
ALTER TABLE `pessoa` RENAME TO `pessoa_antiga`;--> statement-breakpoint
DROP INDEX `idx_passagem_pessoa_dia`;--> statement-breakpoint
DROP INDEX `idx_passagem_pessoa_pessoa`;--> statement-breakpoint
DROP INDEX `idx_pessoa_obra`;--> statement-breakpoint
DROP INDEX `ux_pessoa_id_obra`;--> statement-breakpoint
CREATE TABLE `pessoa` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`nome` text NOT NULL,
	`criado_por` text NOT NULL,
	`criado_em` text NOT NULL,
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`criado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_pessoa_nome" CHECK(length(trim("pessoa"."nome")) > 0),
	CONSTRAINT "ck_pessoa_criado_em" CHECK("pessoa"."criado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE INDEX `idx_pessoa_obra` ON `pessoa` (`obra_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_pessoa_id_obra` ON `pessoa` (`id`,`obra_id`);--> statement-breakpoint
INSERT INTO `pessoa` ("id", "obra_id", "nome", "criado_por", "criado_em") SELECT "id", "obra_id", "nome", "criado_por", "criado_em" FROM `pessoa_antiga`;--> statement-breakpoint
CREATE TABLE `passagem_pessoa` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`pessoa_id` text NOT NULL,
	`funcao_id` text NOT NULL,
	`entrada` text NOT NULL,
	`saida` text,
	`registrado_por` text NOT NULL,
	`registrado_em` text NOT NULL,
	FOREIGN KEY (`funcao_id`) REFERENCES `funcao`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`registrado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`pessoa_id`,`obra_id`) REFERENCES `pessoa`(`id`,`obra_id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_passagem_pessoa_entrada" CHECK("passagem_pessoa"."entrada" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("passagem_pessoa"."entrada") IS NOT NULL AND date("passagem_pessoa"."entrada") = "passagem_pessoa"."entrada"),
	CONSTRAINT "ck_passagem_pessoa_saida" CHECK("passagem_pessoa"."saida" IS NULL OR ("passagem_pessoa"."saida" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("passagem_pessoa"."saida") IS NOT NULL AND date("passagem_pessoa"."saida") = "passagem_pessoa"."saida")),
	CONSTRAINT "ck_passagem_pessoa_intervalo" CHECK("passagem_pessoa"."saida" IS NULL OR "passagem_pessoa"."saida" >= "passagem_pessoa"."entrada"),
	CONSTRAINT "ck_passagem_pessoa_registrado_em" CHECK("passagem_pessoa"."registrado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE INDEX `idx_passagem_pessoa_dia` ON `passagem_pessoa` (`obra_id`,`entrada`,`saida`);--> statement-breakpoint
CREATE INDEX `idx_passagem_pessoa_pessoa` ON `passagem_pessoa` (`pessoa_id`);--> statement-breakpoint
CREATE INDEX `idx_passagem_pessoa_funcao` ON `passagem_pessoa` (`funcao_id`);--> statement-breakpoint
INSERT INTO `passagem_pessoa` ("id", "obra_id", "pessoa_id", "funcao_id", "entrada", "saida", "registrado_por", "registrado_em") SELECT "antiga"."id", "antiga"."obra_id", "antiga"."pessoa_id", "dona"."funcao_id", "antiga"."entrada", "antiga"."saida", "antiga"."registrado_por", "antiga"."registrado_em" FROM `passagem_pessoa_antiga` AS "antiga" JOIN `pessoa_antiga` AS "dona" ON "dona"."id" = "antiga"."pessoa_id";--> statement-breakpoint
DROP TABLE `passagem_pessoa_antiga`;--> statement-breakpoint
DROP TABLE `pessoa_antiga`;
