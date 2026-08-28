CREATE TABLE IF NOT EXISTS "gallery_items" (
  "id" serial PRIMARY KEY NOT NULL, "image_url" text NOT NULL, "image_file_id" text, "alt_text" text NOT NULL,
  "title" text, "description" text, "city" text NOT NULL, "category" text NOT NULL, "location_name" text,
  "latitude" numeric(10, 7), "longitude" numeric(10, 7), "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL, "status" text DEFAULT 'DRAFT' NOT NULL, "taken_at" timestamptz,
  "published_at" timestamptz, "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "gallery_items_city_category_idx" ON "gallery_items" USING btree ("city", "category");
CREATE INDEX IF NOT EXISTS "gallery_items_status_priority_idx" ON "gallery_items" USING btree ("status", "priority");
