DO $$ BEGIN
  ALTER TABLE "media_page_settings" ADD COLUMN "link_bio_title" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "media_page_settings" ADD COLUMN "link_bio_description" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "media_page_settings" ADD COLUMN "link_bio_links" jsonb DEFAULT '[]'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

