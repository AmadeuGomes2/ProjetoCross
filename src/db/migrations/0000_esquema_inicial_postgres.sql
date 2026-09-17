CREATE TABLE "acesso" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"perfil" text NOT NULL,
	"liberado_por" text NOT NULL,
	"liberado_em" text NOT NULL,
	"revogado_por" text,
	"revogado_em" text,
	CONSTRAINT "ck_acesso_perfil" CHECK ("acesso"."perfil" IN ('engenheiro', 'encarregado')),
	CONSTRAINT "ck_acesso_liberado_em" CHECK ("acesso"."liberado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_acesso_revogado_em" CHECK ("acesso"."revogado_em" IS NULL OR "acesso"."revogado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "convite" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"perfil" text NOT NULL,
	"criado_por" text NOT NULL,
	"criado_em" text NOT NULL,
	"expira_em" text NOT NULL,
	"usado_por" text,
	"usado_em" text,
	CONSTRAINT "ck_convite_perfil" CHECK ("convite"."perfil" IN ('engenheiro', 'encarregado')),
	CONSTRAINT "ck_convite_criado_em" CHECK ("convite"."criado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_convite_expira_em" CHECK ("convite"."expira_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_convite_usado_em" CHECK ("convite"."usado_em" IS NULL OR "convite"."usado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "dia_de_obra" (
	"obra_id" text NOT NULL,
	"data" date NOT NULL,
	"estado" text NOT NULL,
	"motivo_parada" text,
	"registrado_por" text NOT NULL,
	"registrado_em" text NOT NULL,
	"atualizado_por" text,
	"atualizado_em" text,
	"fechado_por" text,
	"fechado_em" text,
	"numero_rdo_congelado" integer,
	CONSTRAINT "dia_de_obra_obra_id_data_pk" PRIMARY KEY("obra_id","data"),
	CONSTRAINT "ck_dia_de_obra_estado" CHECK ("dia_de_obra"."estado" IN ('trabalhado', 'parado')),
	CONSTRAINT "ck_dia_de_obra_motivo" CHECK (("dia_de_obra"."estado" = 'parado' AND "dia_de_obra"."motivo_parada" IS NOT NULL AND length(trim("dia_de_obra"."motivo_parada")) > 0)
       OR ("dia_de_obra"."estado" = 'trabalhado' AND "dia_de_obra"."motivo_parada" IS NULL)),
	CONSTRAINT "ck_dia_de_obra_fechamento" CHECK (("dia_de_obra"."fechado_em" IS NULL AND "dia_de_obra"."fechado_por" IS NULL AND "dia_de_obra"."numero_rdo_congelado" IS NULL)
       OR ("dia_de_obra"."fechado_em" IS NOT NULL AND "dia_de_obra"."fechado_por" IS NOT NULL AND "dia_de_obra"."numero_rdo_congelado" IS NOT NULL)),
	CONSTRAINT "ck_dia_de_obra_numero_rdo" CHECK ("dia_de_obra"."numero_rdo_congelado" IS NULL OR "dia_de_obra"."numero_rdo_congelado" >= 0),
	CONSTRAINT "ck_dia_de_obra_registrado_em" CHECK ("dia_de_obra"."registrado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_dia_de_obra_atualizado_em" CHECK ("dia_de_obra"."atualizado_em" IS NULL OR "dia_de_obra"."atualizado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_dia_de_obra_fechado_em" CHECK ("dia_de_obra"."fechado_em" IS NULL OR "dia_de_obra"."fechado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "equipamento" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"identificador" text NOT NULL,
	"tipo_equipamento_id" text NOT NULL,
	"criado_por" text NOT NULL,
	"criado_em" text NOT NULL,
	CONSTRAINT "ux_equipamento_id_obra" UNIQUE("id","obra_id"),
	CONSTRAINT "ck_equipamento_identificador" CHECK (length(trim("equipamento"."identificador")) > 0),
	CONSTRAINT "ck_equipamento_criado_em" CHECK ("equipamento"."criado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "funcao" (
	"id" text PRIMARY KEY NOT NULL,
	"termo" text NOT NULL,
	"termo_normalizado" text NOT NULL,
	"ordem" integer NOT NULL,
	"ativo" integer DEFAULT 1 NOT NULL,
	"criado_em" text NOT NULL,
	CONSTRAINT "ck_funcao_termo" CHECK (length(trim("funcao"."termo")) > 0),
	CONSTRAINT "ck_funcao_normalizado" CHECK (length(trim("funcao"."termo_normalizado")) > 0),
	CONSTRAINT "ck_funcao_ativo" CHECK ("funcao"."ativo" IN (0, 1)),
	CONSTRAINT "ck_funcao_criado_em" CHECK ("funcao"."criado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "lancamento_atividade" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"data" date NOT NULL,
	"autor_id" text NOT NULL,
	"registrado_em" text NOT NULL,
	"atualizado_por" text,
	"atualizado_em" text,
	"raiz_id" text NOT NULL,
	"retifica_id" text,
	"chave_de_rascunho" text,
	"excluido_por" text,
	"excluido_em" text,
	"motivo_exclusao" text,
	"descricao" text NOT NULL,
	"status_id" text NOT NULL,
	CONSTRAINT "ux_atividade_id_obra_data" UNIQUE("id","obra_id","data"),
	CONSTRAINT "ck_atividade_descricao" CHECK (length(trim("lancamento_atividade"."descricao")) > 0),
	CONSTRAINT "ck_atividade_registrado_em" CHECK ("lancamento_atividade"."registrado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_atividade_atualizado_em" CHECK ("lancamento_atividade"."atualizado_em" IS NULL OR "lancamento_atividade"."atualizado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_atividade_excluido_em" CHECK ("lancamento_atividade"."excluido_em" IS NULL OR "lancamento_atividade"."excluido_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_atividade_exclusao" CHECK (("lancamento_atividade"."excluido_em" IS NULL AND "lancamento_atividade"."excluido_por" IS NULL AND "lancamento_atividade"."motivo_exclusao" IS NULL)
       OR ("lancamento_atividade"."excluido_em" IS NOT NULL AND "lancamento_atividade"."excluido_por" IS NOT NULL AND "lancamento_atividade"."motivo_exclusao" IS NOT NULL AND length(trim("lancamento_atividade"."motivo_exclusao")) > 0))
);
--> statement-breakpoint
CREATE TABLE "lancamento_observacao" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"data" date NOT NULL,
	"autor_id" text NOT NULL,
	"registrado_em" text NOT NULL,
	"atualizado_por" text,
	"atualizado_em" text,
	"raiz_id" text NOT NULL,
	"retifica_id" text,
	"chave_de_rascunho" text,
	"excluido_por" text,
	"excluido_em" text,
	"motivo_exclusao" text,
	"lado" text NOT NULL,
	"texto" text NOT NULL,
	CONSTRAINT "ux_observacao_id_obra_data" UNIQUE("id","obra_id","data"),
	CONSTRAINT "ck_observacao_lado" CHECK ("lancamento_observacao"."lado" = 'CROS'),
	CONSTRAINT "ck_observacao_texto" CHECK (length(trim("lancamento_observacao"."texto")) > 0),
	CONSTRAINT "ck_observacao_registrado_em" CHECK ("lancamento_observacao"."registrado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_observacao_atualizado_em" CHECK ("lancamento_observacao"."atualizado_em" IS NULL OR "lancamento_observacao"."atualizado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_observacao_excluido_em" CHECK ("lancamento_observacao"."excluido_em" IS NULL OR "lancamento_observacao"."excluido_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_observacao_exclusao" CHECK (("lancamento_observacao"."excluido_em" IS NULL AND "lancamento_observacao"."excluido_por" IS NULL AND "lancamento_observacao"."motivo_exclusao" IS NULL)
       OR ("lancamento_observacao"."excluido_em" IS NOT NULL AND "lancamento_observacao"."excluido_por" IS NOT NULL AND "lancamento_observacao"."motivo_exclusao" IS NOT NULL AND length(trim("lancamento_observacao"."motivo_exclusao")) > 0))
);
--> statement-breakpoint
CREATE TABLE "lancamento_pluviometria" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"data" date NOT NULL,
	"autor_id" text NOT NULL,
	"registrado_em" text NOT NULL,
	"atualizado_por" text,
	"atualizado_em" text,
	"raiz_id" text NOT NULL,
	"retifica_id" text,
	"chave_de_rascunho" text,
	"excluido_por" text,
	"excluido_em" text,
	"motivo_exclusao" text,
	"noite_anterior" text,
	"manha" text,
	"tarde" text,
	"indice_mm_milesimos" integer NOT NULL,
	CONSTRAINT "ux_pluviometria_id_obra_data" UNIQUE("id","obra_id","data"),
	CONSTRAINT "ck_pluviometria_noite" CHECK ("lancamento_pluviometria"."noite_anterior" IS NULL OR "lancamento_pluviometria"."noite_anterior" IN ('B', 'C', 'I')),
	CONSTRAINT "ck_pluviometria_manha" CHECK ("lancamento_pluviometria"."manha" IS NULL OR "lancamento_pluviometria"."manha" IN ('B', 'C', 'I')),
	CONSTRAINT "ck_pluviometria_tarde" CHECK ("lancamento_pluviometria"."tarde" IS NULL OR "lancamento_pluviometria"."tarde" IN ('B', 'C', 'I')),
	CONSTRAINT "ck_pluviometria_indice" CHECK ("lancamento_pluviometria"."indice_mm_milesimos" >= 0 AND "lancamento_pluviometria"."indice_mm_milesimos" <= 1000000),
	CONSTRAINT "ck_pluviometria_registrado_em" CHECK ("lancamento_pluviometria"."registrado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_pluviometria_atualizado_em" CHECK ("lancamento_pluviometria"."atualizado_em" IS NULL OR "lancamento_pluviometria"."atualizado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_pluviometria_excluido_em" CHECK ("lancamento_pluviometria"."excluido_em" IS NULL OR "lancamento_pluviometria"."excluido_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_pluviometria_exclusao" CHECK (("lancamento_pluviometria"."excluido_em" IS NULL AND "lancamento_pluviometria"."excluido_por" IS NULL AND "lancamento_pluviometria"."motivo_exclusao" IS NULL)
       OR ("lancamento_pluviometria"."excluido_em" IS NOT NULL AND "lancamento_pluviometria"."excluido_por" IS NOT NULL AND "lancamento_pluviometria"."motivo_exclusao" IS NOT NULL AND length(trim("lancamento_pluviometria"."motivo_exclusao")) > 0))
);
--> statement-breakpoint
CREATE TABLE "lancamento_producao" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"data" date NOT NULL,
	"autor_id" text NOT NULL,
	"registrado_em" text NOT NULL,
	"atualizado_por" text,
	"atualizado_em" text,
	"raiz_id" text NOT NULL,
	"retifica_id" text,
	"chave_de_rascunho" text,
	"excluido_por" text,
	"excluido_em" text,
	"motivo_exclusao" text,
	"servico_id" text NOT NULL,
	"quantidade_milesimos" integer NOT NULL,
	CONSTRAINT "ux_producao_id_obra_data" UNIQUE("id","obra_id","data"),
	CONSTRAINT "ck_producao_quantidade" CHECK ("lancamento_producao"."quantidade_milesimos" > 0),
	CONSTRAINT "ck_producao_registrado_em" CHECK ("lancamento_producao"."registrado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_producao_atualizado_em" CHECK ("lancamento_producao"."atualizado_em" IS NULL OR "lancamento_producao"."atualizado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_producao_excluido_em" CHECK ("lancamento_producao"."excluido_em" IS NULL OR "lancamento_producao"."excluido_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_producao_exclusao" CHECK (("lancamento_producao"."excluido_em" IS NULL AND "lancamento_producao"."excluido_por" IS NULL AND "lancamento_producao"."motivo_exclusao" IS NULL)
       OR ("lancamento_producao"."excluido_em" IS NOT NULL AND "lancamento_producao"."excluido_por" IS NOT NULL AND "lancamento_producao"."motivo_exclusao" IS NOT NULL AND length(trim("lancamento_producao"."motivo_exclusao")) > 0))
);
--> statement-breakpoint
CREATE TABLE "obra" (
	"id" text PRIMARY KEY NOT NULL,
	"contrato" text NOT NULL,
	"contratante" text NOT NULL,
	"contratada" text NOT NULL,
	"data_inicio" date NOT NULL,
	"data_termino" date NOT NULL,
	"escopo" text NOT NULL,
	"nome_projeto" text NOT NULL,
	"area" text NOT NULL,
	"local" text NOT NULL,
	"resp_tecnico_nome" text,
	"resp_tecnico_titulo" text,
	"resp_tecnico_crea" text,
	"criado_por" text NOT NULL,
	"criado_em" text NOT NULL,
	CONSTRAINT "ck_obra_contrato" CHECK (length(trim("obra"."contrato")) > 0),
	CONSTRAINT "ck_obra_contratante" CHECK (length(trim("obra"."contratante")) > 0),
	CONSTRAINT "ck_obra_contratada" CHECK (length(trim("obra"."contratada")) > 0),
	CONSTRAINT "ck_obra_escopo" CHECK (length(trim("obra"."escopo")) > 0),
	CONSTRAINT "ck_obra_nome_projeto" CHECK (length(trim("obra"."nome_projeto")) > 0),
	CONSTRAINT "ck_obra_area" CHECK (length(trim("obra"."area")) > 0),
	CONSTRAINT "ck_obra_local" CHECK (length(trim("obra"."local")) > 0),
	CONSTRAINT "ck_obra_termino_apos_inicio" CHECK ("obra"."data_termino" >= "obra"."data_inicio"),
	CONSTRAINT "ck_obra_criado_em" CHECK ("obra"."criado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "passagem_equipamento" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"equipamento_id" text NOT NULL,
	"entrada" date NOT NULL,
	"saida" date,
	"registrado_por" text NOT NULL,
	"registrado_em" text NOT NULL,
	CONSTRAINT "ck_passagem_equipamento_intervalo" CHECK ("passagem_equipamento"."saida" IS NULL OR "passagem_equipamento"."saida" >= "passagem_equipamento"."entrada"),
	CONSTRAINT "ck_passagem_equipamento_registrado_em" CHECK ("passagem_equipamento"."registrado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "passagem_pessoa" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"pessoa_id" text NOT NULL,
	"funcao_id" text NOT NULL,
	"entrada" date NOT NULL,
	"saida" date,
	"registrado_por" text NOT NULL,
	"registrado_em" text NOT NULL,
	CONSTRAINT "ck_passagem_pessoa_intervalo" CHECK ("passagem_pessoa"."saida" IS NULL OR "passagem_pessoa"."saida" >= "passagem_pessoa"."entrada"),
	CONSTRAINT "ck_passagem_pessoa_registrado_em" CHECK ("passagem_pessoa"."registrado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "periodo_bms" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"numero" integer NOT NULL,
	"data_inicial" date NOT NULL,
	"data_final" date NOT NULL,
	"criado_por" text NOT NULL,
	"criado_em" text NOT NULL,
	CONSTRAINT "ck_periodo_bms_numero" CHECK ("periodo_bms"."numero" >= 0),
	CONSTRAINT "ck_periodo_bms_final_apos_inicial" CHECK ("periodo_bms"."data_final" >= "periodo_bms"."data_inicial"),
	CONSTRAINT "ck_periodo_bms_criado_em" CHECK ("periodo_bms"."criado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "pessoa" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"nome" text NOT NULL,
	"criado_por" text NOT NULL,
	"criado_em" text NOT NULL,
	CONSTRAINT "ux_pessoa_id_obra" UNIQUE("id","obra_id"),
	CONSTRAINT "ck_pessoa_nome" CHECK (length(trim("pessoa"."nome")) > 0),
	CONSTRAINT "ck_pessoa_criado_em" CHECK ("pessoa"."criado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "quantidade_projeto_versao" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"servico_id" text NOT NULL,
	"quantidade_milesimos" integer NOT NULL,
	"definido_por" text NOT NULL,
	"definido_em" text NOT NULL,
	CONSTRAINT "ck_quantidade_projeto_positiva" CHECK ("quantidade_projeto_versao"."quantidade_milesimos" > 0),
	CONSTRAINT "ck_quantidade_projeto_definido_em" CHECK ("quantidade_projeto_versao"."definido_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "registro_exportacao" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"momento" text NOT NULL,
	"data_rdo" date NOT NULL,
	"formato" text NOT NULL,
	"lote_id" text,
	CONSTRAINT "ck_exportacao_formato" CHECK ("registro_exportacao"."formato" IN ('PDF', 'XLSX')),
	CONSTRAINT "ck_exportacao_momento" CHECK ("registro_exportacao"."momento" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "servico_controlado" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"nome" text NOT NULL,
	"nome_normalizado" text NOT NULL,
	"ordem" integer NOT NULL,
	"ativo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "ux_servico_id_obra" UNIQUE("id","obra_id"),
	CONSTRAINT "ck_servico_nome" CHECK (length(trim("servico_controlado"."nome")) > 0),
	CONSTRAINT "ck_servico_normalizado" CHECK (length(trim("servico_controlado"."nome_normalizado")) > 0),
	CONSTRAINT "ck_servico_ativo" CHECK ("servico_controlado"."ativo" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE "sessao" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"criado_em" text NOT NULL,
	"expira_em" text NOT NULL,
	"revogada_em" text,
	CONSTRAINT "ck_sessao_criado_em" CHECK ("sessao"."criado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_sessao_expira_em" CHECK ("sessao"."expira_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "ck_sessao_revogada_em" CHECK ("sessao"."revogada_em" IS NULL OR "sessao"."revogada_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "status_atividade" (
	"id" text PRIMARY KEY NOT NULL,
	"termo" text NOT NULL,
	"termo_normalizado" text NOT NULL,
	"ordem" integer NOT NULL,
	"ativo" integer DEFAULT 1 NOT NULL,
	"criado_em" text NOT NULL,
	CONSTRAINT "ck_status_atividade_termo" CHECK (length(trim("status_atividade"."termo")) > 0),
	CONSTRAINT "ck_status_atividade_normalizado" CHECK (length(trim("status_atividade"."termo_normalizado")) > 0),
	CONSTRAINT "ck_status_atividade_ativo" CHECK ("status_atividade"."ativo" IN (0, 1)),
	CONSTRAINT "ck_status_atividade_criado_em" CHECK ("status_atividade"."criado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "sugestao_motivo_parada" (
	"id" text PRIMARY KEY NOT NULL,
	"texto" text NOT NULL,
	"texto_normalizado" text NOT NULL,
	"ordem" integer NOT NULL,
	"ativo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "ck_sugestao_motivo_texto" CHECK (length(trim("sugestao_motivo_parada"."texto")) > 0),
	CONSTRAINT "ck_sugestao_motivo_normalizado" CHECK (length(trim("sugestao_motivo_parada"."texto_normalizado")) > 0),
	CONSTRAINT "ck_sugestao_motivo_ativo" CHECK ("sugestao_motivo_parada"."ativo" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE "tipo_equipamento" (
	"id" text PRIMARY KEY NOT NULL,
	"termo" text NOT NULL,
	"termo_normalizado" text NOT NULL,
	"ordem" integer NOT NULL,
	"ativo" integer DEFAULT 1 NOT NULL,
	"criado_em" text NOT NULL,
	CONSTRAINT "ck_tipo_equipamento_termo" CHECK (length(trim("tipo_equipamento"."termo")) > 0),
	CONSTRAINT "ck_tipo_equipamento_normalizado" CHECK (length(trim("tipo_equipamento"."termo_normalizado")) > 0),
	CONSTRAINT "ck_tipo_equipamento_ativo" CHECK ("tipo_equipamento"."ativo" IN (0, 1)),
	CONSTRAINT "ck_tipo_equipamento_criado_em" CHECK ("tipo_equipamento"."criado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"hash_de_senha" text,
	"e_engenheiro" integer DEFAULT 0 NOT NULL,
	"criado_em" text NOT NULL,
	CONSTRAINT "ck_usuario_nome" CHECK (length(trim("usuario"."nome")) > 0),
	CONSTRAINT "ck_usuario_email" CHECK (length(trim("usuario"."email")) > 0),
	CONSTRAINT "ck_usuario_e_engenheiro" CHECK ("usuario"."e_engenheiro" IN (0, 1)),
	CONSTRAINT "ck_usuario_criado_em" CHECK ("usuario"."criado_em" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
ALTER TABLE "acesso" ADD CONSTRAINT "acesso_obra_id_obra_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obra"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "acesso" ADD CONSTRAINT "acesso_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "acesso" ADD CONSTRAINT "acesso_liberado_por_usuario_id_fk" FOREIGN KEY ("liberado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "acesso" ADD CONSTRAINT "acesso_revogado_por_usuario_id_fk" FOREIGN KEY ("revogado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "convite" ADD CONSTRAINT "convite_obra_id_obra_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obra"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "convite" ADD CONSTRAINT "convite_criado_por_usuario_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "convite" ADD CONSTRAINT "convite_usado_por_usuario_id_fk" FOREIGN KEY ("usado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "dia_de_obra" ADD CONSTRAINT "dia_de_obra_obra_id_obra_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obra"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "dia_de_obra" ADD CONSTRAINT "dia_de_obra_registrado_por_usuario_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "dia_de_obra" ADD CONSTRAINT "dia_de_obra_atualizado_por_usuario_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "dia_de_obra" ADD CONSTRAINT "dia_de_obra_fechado_por_usuario_id_fk" FOREIGN KEY ("fechado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "equipamento" ADD CONSTRAINT "equipamento_obra_id_obra_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obra"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "equipamento" ADD CONSTRAINT "equipamento_tipo_equipamento_id_tipo_equipamento_id_fk" FOREIGN KEY ("tipo_equipamento_id") REFERENCES "public"."tipo_equipamento"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "equipamento" ADD CONSTRAINT "equipamento_criado_por_usuario_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_atividade" ADD CONSTRAINT "lancamento_atividade_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_atividade" ADD CONSTRAINT "lancamento_atividade_atualizado_por_usuario_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_atividade" ADD CONSTRAINT "lancamento_atividade_excluido_por_usuario_id_fk" FOREIGN KEY ("excluido_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_atividade" ADD CONSTRAINT "lancamento_atividade_status_id_status_atividade_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status_atividade"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_atividade" ADD CONSTRAINT "fk_atividade_dia" FOREIGN KEY ("obra_id","data") REFERENCES "public"."dia_de_obra"("obra_id","data") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_atividade" ADD CONSTRAINT "fk_atividade_retifica" FOREIGN KEY ("retifica_id","obra_id","data") REFERENCES "public"."lancamento_atividade"("id","obra_id","data") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_observacao" ADD CONSTRAINT "lancamento_observacao_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_observacao" ADD CONSTRAINT "lancamento_observacao_atualizado_por_usuario_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_observacao" ADD CONSTRAINT "lancamento_observacao_excluido_por_usuario_id_fk" FOREIGN KEY ("excluido_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_observacao" ADD CONSTRAINT "fk_observacao_dia" FOREIGN KEY ("obra_id","data") REFERENCES "public"."dia_de_obra"("obra_id","data") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_observacao" ADD CONSTRAINT "fk_observacao_retifica" FOREIGN KEY ("retifica_id","obra_id","data") REFERENCES "public"."lancamento_observacao"("id","obra_id","data") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_pluviometria" ADD CONSTRAINT "lancamento_pluviometria_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_pluviometria" ADD CONSTRAINT "lancamento_pluviometria_atualizado_por_usuario_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_pluviometria" ADD CONSTRAINT "lancamento_pluviometria_excluido_por_usuario_id_fk" FOREIGN KEY ("excluido_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_pluviometria" ADD CONSTRAINT "fk_pluviometria_dia" FOREIGN KEY ("obra_id","data") REFERENCES "public"."dia_de_obra"("obra_id","data") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_pluviometria" ADD CONSTRAINT "fk_pluviometria_retifica" FOREIGN KEY ("retifica_id","obra_id","data") REFERENCES "public"."lancamento_pluviometria"("id","obra_id","data") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_producao" ADD CONSTRAINT "lancamento_producao_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_producao" ADD CONSTRAINT "lancamento_producao_atualizado_por_usuario_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_producao" ADD CONSTRAINT "lancamento_producao_excluido_por_usuario_id_fk" FOREIGN KEY ("excluido_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_producao" ADD CONSTRAINT "fk_producao_dia" FOREIGN KEY ("obra_id","data") REFERENCES "public"."dia_de_obra"("obra_id","data") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_producao" ADD CONSTRAINT "fk_producao_servico" FOREIGN KEY ("servico_id","obra_id") REFERENCES "public"."servico_controlado"("id","obra_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "lancamento_producao" ADD CONSTRAINT "fk_producao_retifica" FOREIGN KEY ("retifica_id","obra_id","data") REFERENCES "public"."lancamento_producao"("id","obra_id","data") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "obra" ADD CONSTRAINT "obra_criado_por_usuario_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "passagem_equipamento" ADD CONSTRAINT "passagem_equipamento_registrado_por_usuario_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "passagem_equipamento" ADD CONSTRAINT "fk_passagem_equipamento_equipamento" FOREIGN KEY ("equipamento_id","obra_id") REFERENCES "public"."equipamento"("id","obra_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "passagem_pessoa" ADD CONSTRAINT "passagem_pessoa_funcao_id_funcao_id_fk" FOREIGN KEY ("funcao_id") REFERENCES "public"."funcao"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "passagem_pessoa" ADD CONSTRAINT "passagem_pessoa_registrado_por_usuario_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "passagem_pessoa" ADD CONSTRAINT "fk_passagem_pessoa_pessoa" FOREIGN KEY ("pessoa_id","obra_id") REFERENCES "public"."pessoa"("id","obra_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "periodo_bms" ADD CONSTRAINT "periodo_bms_obra_id_obra_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obra"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "periodo_bms" ADD CONSTRAINT "periodo_bms_criado_por_usuario_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "pessoa" ADD CONSTRAINT "pessoa_obra_id_obra_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obra"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "pessoa" ADD CONSTRAINT "pessoa_criado_por_usuario_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "quantidade_projeto_versao" ADD CONSTRAINT "quantidade_projeto_versao_definido_por_usuario_id_fk" FOREIGN KEY ("definido_por") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "quantidade_projeto_versao" ADD CONSTRAINT "fk_quantidade_projeto_servico" FOREIGN KEY ("servico_id","obra_id") REFERENCES "public"."servico_controlado"("id","obra_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "registro_exportacao" ADD CONSTRAINT "registro_exportacao_obra_id_obra_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obra"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "registro_exportacao" ADD CONSTRAINT "registro_exportacao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "servico_controlado" ADD CONSTRAINT "servico_controlado_obra_id_obra_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obra"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_acesso_ativo" ON "acesso" USING btree ("obra_id","usuario_id") WHERE "acesso"."revogado_em" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_acesso_usuario" ON "acesso" USING btree ("usuario_id") WHERE "acesso"."revogado_em" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_convite_token" ON "convite" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_dia_de_obra_estado" ON "dia_de_obra" USING btree ("obra_id","data","estado");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_equipamento_identificador" ON "equipamento" USING btree ("obra_id","identificador");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_funcao_normalizado" ON "funcao" USING btree ("termo_normalizado");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_atividade_retifica" ON "lancamento_atividade" USING btree ("retifica_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_atividade_rascunho" ON "lancamento_atividade" USING btree ("autor_id","chave_de_rascunho");--> statement-breakpoint
CREATE INDEX "idx_atividade_dia" ON "lancamento_atividade" USING btree ("obra_id","data","registrado_em");--> statement-breakpoint
CREATE INDEX "idx_atividade_raiz" ON "lancamento_atividade" USING btree ("raiz_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_observacao_retifica" ON "lancamento_observacao" USING btree ("retifica_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_observacao_rascunho" ON "lancamento_observacao" USING btree ("autor_id","chave_de_rascunho");--> statement-breakpoint
CREATE INDEX "idx_observacao_dia" ON "lancamento_observacao" USING btree ("obra_id","data","lado","registrado_em");--> statement-breakpoint
CREATE INDEX "idx_observacao_raiz" ON "lancamento_observacao" USING btree ("raiz_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_pluviometria_retifica" ON "lancamento_pluviometria" USING btree ("retifica_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_pluviometria_rascunho" ON "lancamento_pluviometria" USING btree ("autor_id","chave_de_rascunho");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_pluviometria_dia" ON "lancamento_pluviometria" USING btree ("obra_id","data") WHERE "lancamento_pluviometria"."retifica_id" IS NULL AND "lancamento_pluviometria"."excluido_em" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_pluviometria_raiz" ON "lancamento_pluviometria" USING btree ("raiz_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_producao_retifica" ON "lancamento_producao" USING btree ("retifica_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_producao_rascunho" ON "lancamento_producao" USING btree ("autor_id","chave_de_rascunho");--> statement-breakpoint
CREATE INDEX "idx_producao_acumulado" ON "lancamento_producao" USING btree ("obra_id","servico_id","data");--> statement-breakpoint
CREATE INDEX "idx_producao_raiz" ON "lancamento_producao" USING btree ("raiz_id");--> statement-breakpoint
CREATE INDEX "idx_passagem_equipamento_dia" ON "passagem_equipamento" USING btree ("obra_id","entrada","saida");--> statement-breakpoint
CREATE INDEX "idx_passagem_equipamento_equipamento" ON "passagem_equipamento" USING btree ("equipamento_id");--> statement-breakpoint
CREATE INDEX "idx_passagem_pessoa_dia" ON "passagem_pessoa" USING btree ("obra_id","entrada","saida");--> statement-breakpoint
CREATE INDEX "idx_passagem_pessoa_pessoa" ON "passagem_pessoa" USING btree ("pessoa_id");--> statement-breakpoint
CREATE INDEX "idx_passagem_pessoa_funcao" ON "passagem_pessoa" USING btree ("funcao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_periodo_bms_numero" ON "periodo_bms" USING btree ("obra_id","numero");--> statement-breakpoint
CREATE INDEX "idx_periodo_bms_busca" ON "periodo_bms" USING btree ("obra_id","data_inicial","data_final");--> statement-breakpoint
CREATE INDEX "idx_pessoa_obra" ON "pessoa" USING btree ("obra_id");--> statement-breakpoint
CREATE INDEX "idx_qtd_projeto_atual" ON "quantidade_projeto_versao" USING btree ("servico_id","definido_em" desc);--> statement-breakpoint
CREATE INDEX "idx_exportacao" ON "registro_exportacao" USING btree ("obra_id","momento" desc);--> statement-breakpoint
CREATE INDEX "idx_exportacao_lote" ON "registro_exportacao" USING btree ("lote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_servico_nome" ON "servico_controlado" USING btree ("obra_id","nome_normalizado");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_servico_ordem" ON "servico_controlado" USING btree ("obra_id","ordem");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_sessao_token" ON "sessao" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_sessao_usuario" ON "sessao" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_status_atividade_normalizado" ON "status_atividade" USING btree ("termo_normalizado");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_sugestao_motivo_normalizado" ON "sugestao_motivo_parada" USING btree ("texto_normalizado");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_tipo_equipamento_normalizado" ON "tipo_equipamento" USING btree ("termo_normalizado");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_usuario_email" ON "usuario" USING btree ("email");