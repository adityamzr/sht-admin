ALTER TABLE "media_page_settings" ADD COLUMN IF NOT EXISTS "link_bio_title" text;
ALTER TABLE "media_page_settings" ADD COLUMN IF NOT EXISTS "link_bio_description" text;
ALTER TABLE "media_page_settings" ADD COLUMN IF NOT EXISTS "link_bio_links" jsonb DEFAULT '[]'::jsonb;
