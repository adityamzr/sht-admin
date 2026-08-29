ALTER TABLE "media_page_settings" ADD COLUMN IF NOT EXISTS "hero_image_url" text;
ALTER TABLE "media_page_settings" ADD COLUMN IF NOT EXISTS "hero_image_file_id" text;
ALTER TABLE "media_page_settings" ADD COLUMN IF NOT EXISTS "hero_headline" text;
ALTER TABLE "media_page_settings" ADD COLUMN IF NOT EXISTS "hero_subheadline" text;
