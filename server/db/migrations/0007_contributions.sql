CREATE TABLE IF NOT EXISTS "contributions" (
 "id" serial PRIMARY KEY NOT NULL, "type" text NOT NULL, "city" text, "subject" text, "message" text NOT NULL, "name" text, "contact" text,
 "source_page" text, "source_url" text, "maps_url" text, "status" text DEFAULT 'NEW' NOT NULL, "internal_note" text,
 "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL, "read_at" timestamptz, "followed_up_at" timestamptz, "archived_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "contributions_status_created_idx" ON "contributions" USING btree ("status","created_at");
CREATE INDEX IF NOT EXISTS "contributions_type_idx" ON "contributions" USING btree ("type");
