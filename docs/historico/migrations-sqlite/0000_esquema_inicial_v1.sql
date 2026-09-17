CREATE TABLE `acesso` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`usuario_id` text NOT NULL,
	`perfil` text NOT NULL,
	`liberado_por` text NOT NULL,
	`liberado_em` text NOT NULL,
	`revogado_por` text,
	`revogado_em` text,
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`liberado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`revogado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_acesso_perfil" CHECK("acesso"."perfil" IN ('engenheiro', 'encarregado')),
	CONSTRAINT "ck_acesso_liberado_em" CHECK("acesso"."liberado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_acesso_revogado_em" CHECK("acesso"."revogado_em" IS NULL OR "acesso"."revogado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_acesso_ativo` ON `acesso` (`obra_id`,`usuario_id`) WHERE "acesso"."revogado_em" IS NULL;--> statement-breakpoint
CREATE INDEX `idx_acesso_usuario` ON `acesso` (`usuario_id`) WHERE "acesso"."revogado_em" IS NULL;--> statement-breakpoint
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
	CONSTRAINT "ck_convite_perfil" CHECK("convite"."perfil" = 'encarregado'),
	CONSTRAINT "ck_convite_criado_em" CHECK("convite"."criado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_convite_expira_em" CHECK("convite"."expira_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_convite_usado_em" CHECK("convite"."usado_em" IS NULL OR "convite"."usado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_convite_token` ON `convite` (`token_hash`);--> statement-breakpoint
CREATE TABLE `dia_de_obra` (
	`obra_id` text NOT NULL,
	`data` text NOT NULL,
	`estado` text NOT NULL,
	`motivo_parada` text,
	`registrado_por` text NOT NULL,
	`registrado_em` text NOT NULL,
	`atualizado_por` text,
	`atualizado_em` text,
	`fechado_por` text,
	`fechado_em` text,
	`numero_rdo_congelado` integer,
	PRIMARY KEY(`obra_id`, `data`),
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`registrado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`atualizado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`fechado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_dia_de_obra_data" CHECK("dia_de_obra"."data" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("dia_de_obra"."data") IS NOT NULL AND date("dia_de_obra"."data") = "dia_de_obra"."data"),
	CONSTRAINT "ck_dia_de_obra_estado" CHECK("dia_de_obra"."estado" IN ('trabalhado', 'parado')),
	CONSTRAINT "ck_dia_de_obra_motivo" CHECK(("dia_de_obra"."estado" = 'parado' AND "dia_de_obra"."motivo_parada" IS NOT NULL AND length(trim("dia_de_obra"."motivo_parada")) > 0)
       OR ("dia_de_obra"."estado" = 'trabalhado' AND "dia_de_obra"."motivo_parada" IS NULL)),
	CONSTRAINT "ck_dia_de_obra_fechamento" CHECK(("dia_de_obra"."fechado_em" IS NULL AND "dia_de_obra"."fechado_por" IS NULL AND "dia_de_obra"."numero_rdo_congelado" IS NULL)
       OR ("dia_de_obra"."fechado_em" IS NOT NULL AND "dia_de_obra"."fechado_por" IS NOT NULL AND "dia_de_obra"."numero_rdo_congelado" IS NOT NULL)),
	CONSTRAINT "ck_dia_de_obra_numero_rdo" CHECK("dia_de_obra"."numero_rdo_congelado" IS NULL OR "dia_de_obra"."numero_rdo_congelado" >= 0),
	CONSTRAINT "ck_dia_de_obra_registrado_em" CHECK("dia_de_obra"."registrado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_dia_de_obra_atualizado_em" CHECK("dia_de_obra"."atualizado_em" IS NULL OR "dia_de_obra"."atualizado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_dia_de_obra_fechado_em" CHECK("dia_de_obra"."fechado_em" IS NULL OR "dia_de_obra"."fechado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_dia_de_obra_estado` ON `dia_de_obra` (`obra_id`,`data`,`estado`);--> statement-breakpoint
CREATE TABLE `equipamento` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`identificador` text NOT NULL,
	`tipo_equipamento_id` text NOT NULL,
	`criado_por` text NOT NULL,
	`criado_em` text NOT NULL,
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`tipo_equipamento_id`) REFERENCES `tipo_equipamento`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`criado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_equipamento_identificador" CHECK(length(trim("equipamento"."identificador")) > 0),
	CONSTRAINT "ck_equipamento_criado_em" CHECK("equipamento"."criado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_equipamento_identificador` ON `equipamento` (`obra_id`,`identificador`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_equipamento_id_obra` ON `equipamento` (`id`,`obra_id`);--> statement-breakpoint
CREATE TABLE `funcao` (
	`id` text PRIMARY KEY NOT NULL,
	`termo` text NOT NULL,
	`termo_normalizado` text NOT NULL,
	`ordem` integer NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`criado_em` text NOT NULL,
	CONSTRAINT "ck_funcao_termo" CHECK(length(trim("funcao"."termo")) > 0),
	CONSTRAINT "ck_funcao_normalizado" CHECK(length(trim("funcao"."termo_normalizado")) > 0),
	CONSTRAINT "ck_funcao_ativo" CHECK("funcao"."ativo" IN (0, 1)),
	CONSTRAINT "ck_funcao_criado_em" CHECK("funcao"."criado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_funcao_normalizado` ON `funcao` (`termo_normalizado`);--> statement-breakpoint
CREATE TABLE `lancamento_atividade` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`data` text NOT NULL,
	`autor_id` text NOT NULL,
	`registrado_em` text NOT NULL,
	`atualizado_por` text,
	`atualizado_em` text,
	`raiz_id` text NOT NULL,
	`retifica_id` text,
	`chave_de_rascunho` text,
	`descricao` text NOT NULL,
	`status_id` text NOT NULL,
	FOREIGN KEY (`autor_id`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`atualizado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`status_id`) REFERENCES `status_atividade`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`obra_id`,`data`) REFERENCES `dia_de_obra`(`obra_id`,`data`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`retifica_id`,`obra_id`,`data`) REFERENCES `lancamento_atividade`(`id`,`obra_id`,`data`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_atividade_data" CHECK("lancamento_atividade"."data" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("lancamento_atividade"."data") IS NOT NULL AND date("lancamento_atividade"."data") = "lancamento_atividade"."data"),
	CONSTRAINT "ck_atividade_descricao" CHECK(length(trim("lancamento_atividade"."descricao")) > 0),
	CONSTRAINT "ck_atividade_registrado_em" CHECK("lancamento_atividade"."registrado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_atividade_atualizado_em" CHECK("lancamento_atividade"."atualizado_em" IS NULL OR "lancamento_atividade"."atualizado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_atividade_id_obra_data` ON `lancamento_atividade` (`id`,`obra_id`,`data`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_atividade_retifica` ON `lancamento_atividade` (`retifica_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_atividade_rascunho` ON `lancamento_atividade` (`autor_id`,`chave_de_rascunho`);--> statement-breakpoint
CREATE INDEX `idx_atividade_dia` ON `lancamento_atividade` (`obra_id`,`data`,`registrado_em`);--> statement-breakpoint
CREATE INDEX `idx_atividade_raiz` ON `lancamento_atividade` (`raiz_id`);--> statement-breakpoint
CREATE TABLE `lancamento_observacao` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`data` text NOT NULL,
	`autor_id` text NOT NULL,
	`registrado_em` text NOT NULL,
	`atualizado_por` text,
	`atualizado_em` text,
	`raiz_id` text NOT NULL,
	`retifica_id` text,
	`chave_de_rascunho` text,
	`lado` text NOT NULL,
	`texto` text NOT NULL,
	FOREIGN KEY (`autor_id`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`atualizado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`obra_id`,`data`) REFERENCES `dia_de_obra`(`obra_id`,`data`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`retifica_id`,`obra_id`,`data`) REFERENCES `lancamento_observacao`(`id`,`obra_id`,`data`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_observacao_data" CHECK("lancamento_observacao"."data" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("lancamento_observacao"."data") IS NOT NULL AND date("lancamento_observacao"."data") = "lancamento_observacao"."data"),
	CONSTRAINT "ck_observacao_lado" CHECK("lancamento_observacao"."lado" = 'CROS'),
	CONSTRAINT "ck_observacao_texto" CHECK(length(trim("lancamento_observacao"."texto")) > 0),
	CONSTRAINT "ck_observacao_registrado_em" CHECK("lancamento_observacao"."registrado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_observacao_atualizado_em" CHECK("lancamento_observacao"."atualizado_em" IS NULL OR "lancamento_observacao"."atualizado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_observacao_id_obra_data` ON `lancamento_observacao` (`id`,`obra_id`,`data`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_observacao_retifica` ON `lancamento_observacao` (`retifica_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_observacao_rascunho` ON `lancamento_observacao` (`autor_id`,`chave_de_rascunho`);--> statement-breakpoint
CREATE INDEX `idx_observacao_dia` ON `lancamento_observacao` (`obra_id`,`data`,`lado`,`registrado_em`);--> statement-breakpoint
CREATE INDEX `idx_observacao_raiz` ON `lancamento_observacao` (`raiz_id`);--> statement-breakpoint
CREATE TABLE `lancamento_pluviometria` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`data` text NOT NULL,
	`autor_id` text NOT NULL,
	`registrado_em` text NOT NULL,
	`atualizado_por` text,
	`atualizado_em` text,
	`raiz_id` text NOT NULL,
	`retifica_id` text,
	`chave_de_rascunho` text,
	`noite_anterior` text,
	`manha` text,
	`tarde` text,
	`indice_mm_milesimos` integer NOT NULL,
	FOREIGN KEY (`autor_id`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`atualizado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`obra_id`,`data`) REFERENCES `dia_de_obra`(`obra_id`,`data`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`retifica_id`,`obra_id`,`data`) REFERENCES `lancamento_pluviometria`(`id`,`obra_id`,`data`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_pluviometria_data" CHECK("lancamento_pluviometria"."data" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("lancamento_pluviometria"."data") IS NOT NULL AND date("lancamento_pluviometria"."data") = "lancamento_pluviometria"."data"),
	CONSTRAINT "ck_pluviometria_noite" CHECK("lancamento_pluviometria"."noite_anterior" IS NULL OR "lancamento_pluviometria"."noite_anterior" IN ('B', 'C', 'I')),
	CONSTRAINT "ck_pluviometria_manha" CHECK("lancamento_pluviometria"."manha" IS NULL OR "lancamento_pluviometria"."manha" IN ('B', 'C', 'I')),
	CONSTRAINT "ck_pluviometria_tarde" CHECK("lancamento_pluviometria"."tarde" IS NULL OR "lancamento_pluviometria"."tarde" IN ('B', 'C', 'I')),
	CONSTRAINT "ck_pluviometria_indice" CHECK("lancamento_pluviometria"."indice_mm_milesimos" >= 0 AND "lancamento_pluviometria"."indice_mm_milesimos" <= 1000000),
	CONSTRAINT "ck_pluviometria_registrado_em" CHECK("lancamento_pluviometria"."registrado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_pluviometria_atualizado_em" CHECK("lancamento_pluviometria"."atualizado_em" IS NULL OR "lancamento_pluviometria"."atualizado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_pluviometria_id_obra_data` ON `lancamento_pluviometria` (`id`,`obra_id`,`data`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_pluviometria_retifica` ON `lancamento_pluviometria` (`retifica_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_pluviometria_rascunho` ON `lancamento_pluviometria` (`autor_id`,`chave_de_rascunho`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_pluviometria_dia` ON `lancamento_pluviometria` (`obra_id`,`data`) WHERE "lancamento_pluviometria"."retifica_id" IS NULL;--> statement-breakpoint
CREATE INDEX `idx_pluviometria_raiz` ON `lancamento_pluviometria` (`raiz_id`);--> statement-breakpoint
CREATE TABLE `lancamento_producao` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`data` text NOT NULL,
	`autor_id` text NOT NULL,
	`registrado_em` text NOT NULL,
	`atualizado_por` text,
	`atualizado_em` text,
	`raiz_id` text NOT NULL,
	`retifica_id` text,
	`chave_de_rascunho` text,
	`servico_id` text NOT NULL,
	`quantidade_milesimos` integer NOT NULL,
	FOREIGN KEY (`autor_id`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`atualizado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`obra_id`,`data`) REFERENCES `dia_de_obra`(`obra_id`,`data`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`servico_id`,`obra_id`) REFERENCES `servico_controlado`(`id`,`obra_id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`retifica_id`,`obra_id`,`data`) REFERENCES `lancamento_producao`(`id`,`obra_id`,`data`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_producao_data" CHECK("lancamento_producao"."data" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("lancamento_producao"."data") IS NOT NULL AND date("lancamento_producao"."data") = "lancamento_producao"."data"),
	CONSTRAINT "ck_producao_quantidade" CHECK("lancamento_producao"."quantidade_milesimos" > 0),
	CONSTRAINT "ck_producao_registrado_em" CHECK("lancamento_producao"."registrado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_producao_atualizado_em" CHECK("lancamento_producao"."atualizado_em" IS NULL OR "lancamento_producao"."atualizado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_producao_id_obra_data` ON `lancamento_producao` (`id`,`obra_id`,`data`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_producao_retifica` ON `lancamento_producao` (`retifica_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_producao_rascunho` ON `lancamento_producao` (`autor_id`,`chave_de_rascunho`);--> statement-breakpoint
CREATE INDEX `idx_producao_acumulado` ON `lancamento_producao` (`obra_id`,`servico_id`,`data`);--> statement-breakpoint
CREATE INDEX `idx_producao_raiz` ON `lancamento_producao` (`raiz_id`);--> statement-breakpoint
CREATE TABLE `obra` (
	`id` text PRIMARY KEY NOT NULL,
	`contrato` text NOT NULL,
	`contratante` text NOT NULL,
	`contratada` text NOT NULL,
	`data_inicio` text NOT NULL,
	`data_termino` text NOT NULL,
	`escopo` text NOT NULL,
	`nome_projeto` text NOT NULL,
	`area` text NOT NULL,
	`local` text NOT NULL,
	`resp_tecnico_nome` text,
	`resp_tecnico_titulo` text,
	`resp_tecnico_crea` text,
	`criado_por` text NOT NULL,
	`criado_em` text NOT NULL,
	FOREIGN KEY (`criado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_obra_contrato" CHECK(length(trim("obra"."contrato")) > 0),
	CONSTRAINT "ck_obra_contratante" CHECK(length(trim("obra"."contratante")) > 0),
	CONSTRAINT "ck_obra_contratada" CHECK(length(trim("obra"."contratada")) > 0),
	CONSTRAINT "ck_obra_escopo" CHECK(length(trim("obra"."escopo")) > 0),
	CONSTRAINT "ck_obra_nome_projeto" CHECK(length(trim("obra"."nome_projeto")) > 0),
	CONSTRAINT "ck_obra_area" CHECK(length(trim("obra"."area")) > 0),
	CONSTRAINT "ck_obra_local" CHECK(length(trim("obra"."local")) > 0),
	CONSTRAINT "ck_obra_data_inicio" CHECK("obra"."data_inicio" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("obra"."data_inicio") IS NOT NULL AND date("obra"."data_inicio") = "obra"."data_inicio"),
	CONSTRAINT "ck_obra_data_termino" CHECK("obra"."data_termino" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("obra"."data_termino") IS NOT NULL AND date("obra"."data_termino") = "obra"."data_termino"),
	CONSTRAINT "ck_obra_termino_apos_inicio" CHECK("obra"."data_termino" >= "obra"."data_inicio"),
	CONSTRAINT "ck_obra_criado_em" CHECK("obra"."criado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE TABLE `passagem_equipamento` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`equipamento_id` text NOT NULL,
	`entrada` text NOT NULL,
	`saida` text,
	`registrado_por` text NOT NULL,
	`registrado_em` text NOT NULL,
	FOREIGN KEY (`registrado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`equipamento_id`,`obra_id`) REFERENCES `equipamento`(`id`,`obra_id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_passagem_equipamento_entrada" CHECK("passagem_equipamento"."entrada" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("passagem_equipamento"."entrada") IS NOT NULL AND date("passagem_equipamento"."entrada") = "passagem_equipamento"."entrada"),
	CONSTRAINT "ck_passagem_equipamento_saida" CHECK("passagem_equipamento"."saida" IS NULL OR ("passagem_equipamento"."saida" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("passagem_equipamento"."saida") IS NOT NULL AND date("passagem_equipamento"."saida") = "passagem_equipamento"."saida")),
	CONSTRAINT "ck_passagem_equipamento_intervalo" CHECK("passagem_equipamento"."saida" IS NULL OR "passagem_equipamento"."saida" >= "passagem_equipamento"."entrada"),
	CONSTRAINT "ck_passagem_equipamento_registrado_em" CHECK("passagem_equipamento"."registrado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE INDEX `idx_passagem_equipamento_dia` ON `passagem_equipamento` (`obra_id`,`entrada`,`saida`);--> statement-breakpoint
CREATE INDEX `idx_passagem_equipamento_equipamento` ON `passagem_equipamento` (`equipamento_id`);--> statement-breakpoint
CREATE TABLE `passagem_pessoa` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`pessoa_id` text NOT NULL,
	`entrada` text NOT NULL,
	`saida` text,
	`registrado_por` text NOT NULL,
	`registrado_em` text NOT NULL,
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
CREATE TABLE `periodo_bms` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`numero` integer NOT NULL,
	`data_inicial` text NOT NULL,
	`data_final` text NOT NULL,
	`criado_por` text NOT NULL,
	`criado_em` text NOT NULL,
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`criado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_periodo_bms_numero" CHECK("periodo_bms"."numero" >= 0),
	CONSTRAINT "ck_periodo_bms_data_inicial" CHECK("periodo_bms"."data_inicial" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("periodo_bms"."data_inicial") IS NOT NULL AND date("periodo_bms"."data_inicial") = "periodo_bms"."data_inicial"),
	CONSTRAINT "ck_periodo_bms_data_final" CHECK("periodo_bms"."data_final" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("periodo_bms"."data_final") IS NOT NULL AND date("periodo_bms"."data_final") = "periodo_bms"."data_final"),
	CONSTRAINT "ck_periodo_bms_final_apos_inicial" CHECK("periodo_bms"."data_final" >= "periodo_bms"."data_inicial"),
	CONSTRAINT "ck_periodo_bms_criado_em" CHECK("periodo_bms"."criado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_periodo_bms_numero` ON `periodo_bms` (`obra_id`,`numero`);--> statement-breakpoint
CREATE INDEX `idx_periodo_bms_busca` ON `periodo_bms` (`obra_id`,`data_inicial`,`data_final`);--> statement-breakpoint
CREATE TABLE `pessoa` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`nome` text NOT NULL,
	`funcao_id` text NOT NULL,
	`criado_por` text NOT NULL,
	`criado_em` text NOT NULL,
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`funcao_id`) REFERENCES `funcao`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`criado_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_pessoa_nome" CHECK(length(trim("pessoa"."nome")) > 0),
	CONSTRAINT "ck_pessoa_criado_em" CHECK("pessoa"."criado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE INDEX `idx_pessoa_obra` ON `pessoa` (`obra_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_pessoa_id_obra` ON `pessoa` (`id`,`obra_id`);--> statement-breakpoint
CREATE TABLE `quantidade_projeto_versao` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`servico_id` text NOT NULL,
	`quantidade_milesimos` integer NOT NULL,
	`definido_por` text NOT NULL,
	`definido_em` text NOT NULL,
	FOREIGN KEY (`definido_por`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`servico_id`,`obra_id`) REFERENCES `servico_controlado`(`id`,`obra_id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_quantidade_projeto_positiva" CHECK("quantidade_projeto_versao"."quantidade_milesimos" > 0),
	CONSTRAINT "ck_quantidade_projeto_definido_em" CHECK("quantidade_projeto_versao"."definido_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE INDEX `idx_qtd_projeto_atual` ON `quantidade_projeto_versao` (`servico_id`,"definido_em" desc);--> statement-breakpoint
CREATE TABLE `registro_exportacao` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`usuario_id` text NOT NULL,
	`momento` text NOT NULL,
	`data_rdo` text NOT NULL,
	`formato` text NOT NULL,
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_exportacao_formato" CHECK("registro_exportacao"."formato" = 'PDF'),
	CONSTRAINT "ck_exportacao_data_rdo" CHECK("registro_exportacao"."data_rdo" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date("registro_exportacao"."data_rdo") IS NOT NULL AND date("registro_exportacao"."data_rdo") = "registro_exportacao"."data_rdo"),
	CONSTRAINT "ck_exportacao_momento" CHECK("registro_exportacao"."momento" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE INDEX `idx_exportacao` ON `registro_exportacao` (`obra_id`,"momento" desc);--> statement-breakpoint
CREATE TABLE `servico_controlado` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`nome` text NOT NULL,
	`nome_normalizado` text NOT NULL,
	`ordem` integer NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`obra_id`) REFERENCES `obra`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_servico_nome" CHECK(length(trim("servico_controlado"."nome")) > 0),
	CONSTRAINT "ck_servico_normalizado" CHECK(length(trim("servico_controlado"."nome_normalizado")) > 0),
	CONSTRAINT "ck_servico_ativo" CHECK("servico_controlado"."ativo" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_servico_nome` ON `servico_controlado` (`obra_id`,`nome_normalizado`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_servico_ordem` ON `servico_controlado` (`obra_id`,`ordem`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_servico_id_obra` ON `servico_controlado` (`id`,`obra_id`);--> statement-breakpoint
CREATE TABLE `sessao` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`criado_em` text NOT NULL,
	`expira_em` text NOT NULL,
	`revogada_em` text,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "ck_sessao_criado_em" CHECK("sessao"."criado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_sessao_expira_em" CHECK("sessao"."expira_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'),
	CONSTRAINT "ck_sessao_revogada_em" CHECK("sessao"."revogada_em" IS NULL OR "sessao"."revogada_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_sessao_token` ON `sessao` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_sessao_usuario` ON `sessao` (`usuario_id`);--> statement-breakpoint
CREATE TABLE `status_atividade` (
	`id` text PRIMARY KEY NOT NULL,
	`termo` text NOT NULL,
	`termo_normalizado` text NOT NULL,
	`ordem` integer NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`criado_em` text NOT NULL,
	CONSTRAINT "ck_status_atividade_termo" CHECK(length(trim("status_atividade"."termo")) > 0),
	CONSTRAINT "ck_status_atividade_normalizado" CHECK(length(trim("status_atividade"."termo_normalizado")) > 0),
	CONSTRAINT "ck_status_atividade_ativo" CHECK("status_atividade"."ativo" IN (0, 1)),
	CONSTRAINT "ck_status_atividade_criado_em" CHECK("status_atividade"."criado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_status_atividade_normalizado` ON `status_atividade` (`termo_normalizado`);--> statement-breakpoint
CREATE TABLE `sugestao_motivo_parada` (
	`id` text PRIMARY KEY NOT NULL,
	`texto` text NOT NULL,
	`texto_normalizado` text NOT NULL,
	`ordem` integer NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "ck_sugestao_motivo_texto" CHECK(length(trim("sugestao_motivo_parada"."texto")) > 0),
	CONSTRAINT "ck_sugestao_motivo_normalizado" CHECK(length(trim("sugestao_motivo_parada"."texto_normalizado")) > 0),
	CONSTRAINT "ck_sugestao_motivo_ativo" CHECK("sugestao_motivo_parada"."ativo" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_sugestao_motivo_normalizado` ON `sugestao_motivo_parada` (`texto_normalizado`);--> statement-breakpoint
CREATE TABLE `tipo_equipamento` (
	`id` text PRIMARY KEY NOT NULL,
	`termo` text NOT NULL,
	`termo_normalizado` text NOT NULL,
	`ordem` integer NOT NULL,
	`ativo` integer DEFAULT 1 NOT NULL,
	`criado_em` text NOT NULL,
	CONSTRAINT "ck_tipo_equipamento_termo" CHECK(length(trim("tipo_equipamento"."termo")) > 0),
	CONSTRAINT "ck_tipo_equipamento_normalizado" CHECK(length(trim("tipo_equipamento"."termo_normalizado")) > 0),
	CONSTRAINT "ck_tipo_equipamento_ativo" CHECK("tipo_equipamento"."ativo" IN (0, 1)),
	CONSTRAINT "ck_tipo_equipamento_criado_em" CHECK("tipo_equipamento"."criado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_tipo_equipamento_normalizado` ON `tipo_equipamento` (`termo_normalizado`);--> statement-breakpoint
CREATE TABLE `usuario` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`email` text NOT NULL,
	`hash_de_senha` text,
	`criado_em` text NOT NULL,
	CONSTRAINT "ck_usuario_nome" CHECK(length(trim("usuario"."nome")) > 0),
	CONSTRAINT "ck_usuario_email" CHECK(length(trim("usuario"."email")) > 0),
	CONSTRAINT "ck_usuario_criado_em" CHECK("usuario"."criado_em" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_usuario_email` ON `usuario` (`email`);