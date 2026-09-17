-- A restricao da logo, apertada em duas frentes.
--
-- 1. `image/webp` sai da lista. `@react-pdf/image` sabe desenhar jpg, jpeg, png
--    e svg; com WebP o renderizador engolia o erro e o PDF saia sem a marca, em
--    silencio, enquanto a tela a mostrava. SVG ja estava fora por seguranca.
--
-- 2. `logo_tipo IS NOT NULL` passa a ser exigido explicitamente. Sem isso,
--    bytes com tipo nulo PASSAVAM: `NULL IN (...)` e `NULL`, `true AND NULL` e
--    `NULL`, e um `CHECK` so recusa quando o resultado e `false`.
--
-- Se alguma obra ja tiver logo em WebP, ou meia logo gravada, o `ADD` abaixo
-- falha. E o comportamento certo: a migration nao apaga a logo de ninguem por
-- conta propria. Nesse caso, acerte pela tela e rode de novo.
ALTER TABLE "obra" DROP CONSTRAINT "ck_obra_logo";--> statement-breakpoint
ALTER TABLE "obra" ADD CONSTRAINT "ck_obra_logo" CHECK (("obra"."logo" IS NULL AND "obra"."logo_tipo" IS NULL)
         OR ("obra"."logo" IS NOT NULL AND "obra"."logo_tipo" IS NOT NULL
             AND "obra"."logo_tipo" IN ('image/png', 'image/jpeg')));