CREATE TABLE IF NOT EXISTS "media_page_settings" (
 "id" serial PRIMARY KEY NOT NULL, "page_key" text NOT NULL UNIQUE, "featured_article_id" integer, "supporting_article_ids" jsonb DEFAULT '[]'::jsonb NOT NULL, "editorial_article_ids" jsonb DEFAULT '[]'::jsonb NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
DO $$ BEGIN ALTER TABLE "media_page_settings" ADD CONSTRAINT "media_page_settings_featured_article_id_articles_id_fk" FOREIGN KEY ("featured_article_id") REFERENCES "articles"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
