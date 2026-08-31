-- Additive migration: preserve every master row and backfill only Indonesia.
CREATE TABLE "guide_translations" (
  "id" serial PRIMARY KEY,
  "guide_id" integer NOT NULL REFERENCES "guides"("id") ON DELETE CASCADE,
  "locale" text NOT NULL,
  "title" text DEFAULT '' NOT NULL,
  "slug" text,
  "summary" text,
  "body" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "guide_translations_entity_locale_unique" ON "guide_translations" ("guide_id", "locale");
--> statement-breakpoint
CREATE UNIQUE INDEX "guide_translations_locale_slug_unique" ON "guide_translations" ("locale", "slug") WHERE "slug" IS NOT NULL;
--> statement-breakpoint
INSERT INTO "guide_translations" ("guide_id", "locale", "title", "slug", "summary", "body", "created_at", "updated_at")
SELECT "id", 'id', "title", "slug", "summary", "body", "created_at", "updated_at" FROM "guides"
ON CONFLICT ("guide_id", "locale") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "gallery_translations" (
  "id" serial PRIMARY KEY,
  "gallery_id" integer NOT NULL REFERENCES "gallery_items"("id") ON DELETE CASCADE,
  "locale" text NOT NULL,
  "alt_text" text DEFAULT '' NOT NULL,
  "title" text,
  "description" text,
  "location_name" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "gallery_translations_entity_locale_unique" ON "gallery_translations" ("gallery_id", "locale");
--> statement-breakpoint
INSERT INTO "gallery_translations" ("gallery_id", "locale", "alt_text", "title", "description", "location_name", "created_at", "updated_at")
SELECT "id", 'id', "alt_text", "title", "description", "location_name", "created_at", "updated_at" FROM "gallery_items"
ON CONFLICT ("gallery_id", "locale") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "map_location_translations" (
  "id" serial PRIMARY KEY,
  "location_id" integer NOT NULL REFERENCES "map_locations"("id") ON DELETE CASCADE,
  "locale" text NOT NULL,
  "name" text DEFAULT '' NOT NULL,
  "short_description" text DEFAULT '' NOT NULL,
  "alt_text" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "map_location_translations_entity_locale_unique" ON "map_location_translations" ("location_id", "locale");
--> statement-breakpoint
INSERT INTO "map_location_translations" ("location_id", "locale", "name", "short_description", "alt_text", "created_at", "updated_at")
SELECT "id", 'id', "name", "short_description", "alt_text", "created_at", "updated_at" FROM "map_locations"
ON CONFLICT ("location_id", "locale") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "media_page_settings_translations" (
  "id" serial PRIMARY KEY,
  "page_settings_id" integer NOT NULL REFERENCES "media_page_settings"("id") ON DELETE CASCADE,
  "locale" text NOT NULL,
  "hero_headline" text,
  "hero_subheadline" text,
  "hero_topic_labels" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "media_page_settings_translations_entity_locale_unique" ON "media_page_settings_translations" ("page_settings_id", "locale");
--> statement-breakpoint
INSERT INTO "media_page_settings_translations" ("page_settings_id", "locale", "hero_headline", "hero_subheadline", "hero_topic_labels", "created_at", "updated_at")
SELECT "id", 'id', "hero_headline", "hero_subheadline", coalesce((SELECT jsonb_object_agg(topic->>'id', topic->>'label') FROM jsonb_array_elements(coalesce("hero_topic_override", '[]'::jsonb)) topic), '{}'::jsonb), "created_at", "updated_at" FROM "media_page_settings" WHERE "page_key" = 'home'
ON CONFLICT ("page_settings_id", "locale") DO NOTHING;
