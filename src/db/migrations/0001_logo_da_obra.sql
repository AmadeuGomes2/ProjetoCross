ALTER TABLE "obra" ADD COLUMN "logo" "bytea";--> statement-breakpoint
ALTER TABLE "obra" ADD COLUMN "logo_tipo" text;--> statement-breakpoint
ALTER TABLE "obra" ADD CONSTRAINT "ck_obra_logo" CHECK (("obra"."logo" IS NULL AND "obra"."logo_tipo" IS NULL)
         OR ("obra"."logo" IS NOT NULL AND "obra"."logo_tipo" IN ('image/png', 'image/jpeg', 'image/webp')));