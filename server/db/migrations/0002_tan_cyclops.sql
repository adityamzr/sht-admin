CREATE TABLE IF NOT EXISTS "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"hero_image" text DEFAULT '' NOT NULL,
	"hero_image_alt" text DEFAULT '' NOT NULL,
	"body" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"city" text DEFAULT 'GENERAL' NOT NULL,
	"content_type" text DEFAULT 'article' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"seo_title" text,
	"seo_description" text,
	"og_image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_status_priority_idx" ON "articles" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_city_idx" ON "articles" USING btree ("city");