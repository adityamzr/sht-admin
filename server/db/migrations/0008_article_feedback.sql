CREATE TABLE IF NOT EXISTS "article_feedback" (
 "id" serial PRIMARY KEY NOT NULL, "article_id" integer NOT NULL, "value" text NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL
);
DO $$ BEGIN
 ALTER TABLE "article_feedback" ADD CONSTRAINT "article_feedback_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "article_feedback_article_idx" ON "article_feedback" USING btree ("article_id");
CREATE INDEX IF NOT EXISTS "article_feedback_created_idx" ON "article_feedback" USING btree ("created_at");
