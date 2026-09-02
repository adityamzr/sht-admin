DROP INDEX IF EXISTS "article_translations_locale_slug_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "article_translations_locale_slug_unique" ON "article_translations" USING btree ("locale","slug") WHERE "slug" IS NOT NULL;
