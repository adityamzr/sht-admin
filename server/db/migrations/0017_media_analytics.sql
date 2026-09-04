CREATE TABLE IF NOT EXISTS "media_analytics_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "visitor_id" text NOT NULL,
  "session_id" text NOT NULL,
  "path" text NOT NULL,
  "locale" text NOT NULL,
  "entity_type" text,
  "entity_id" integer,
  "city" text,
  "category" text,
  "referrer_host" text,
  "device_type" text,
  "country_code" text,
  "metadata" jsonb,
  "occurred_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "media_analytics_events_event_id_unique" UNIQUE("event_id")
);
CREATE INDEX IF NOT EXISTS "media_analytics_occurred_idx" ON "media_analytics_events" ("occurred_at");
CREATE INDEX IF NOT EXISTS "media_analytics_type_occurred_idx" ON "media_analytics_events" ("event_type", "occurred_at");
CREATE INDEX IF NOT EXISTS "media_analytics_visitor_occurred_idx" ON "media_analytics_events" ("visitor_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "media_analytics_session_occurred_idx" ON "media_analytics_events" ("session_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "media_analytics_entity_occurred_idx" ON "media_analytics_events" ("entity_type", "entity_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "media_analytics_locale_occurred_idx" ON "media_analytics_events" ("locale", "occurred_at");
CREATE INDEX IF NOT EXISTS "media_analytics_city_occurred_idx" ON "media_analytics_events" ("city", "occurred_at");
