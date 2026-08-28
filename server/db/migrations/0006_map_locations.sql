CREATE TABLE IF NOT EXISTS "map_locations" (
 "id" serial PRIMARY KEY NOT NULL, "source_key" text UNIQUE, "name" text NOT NULL, "city" text NOT NULL, "category" text NOT NULL,
 "short_description" text DEFAULT '' NOT NULL, "latitude" numeric(10,7) NOT NULL, "longitude" numeric(10,7) NOT NULL, "google_maps_url" text,
 "image_url" text, "image_file_id" text, "alt_text" text, "tags" jsonb DEFAULT '[]'::jsonb NOT NULL, "sort_order" integer DEFAULT 0 NOT NULL,
 "is_active" boolean DEFAULT true NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "map_locations_city_category_idx" ON "map_locations" USING btree ("city","category");
CREATE INDEX IF NOT EXISTS "map_locations_active_sort_idx" ON "map_locations" USING btree ("is_active","sort_order");
