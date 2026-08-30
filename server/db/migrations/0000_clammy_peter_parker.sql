CREATE SEQUENCE "public"."estimation_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departure_cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"fee_per_pax" numeric(18, 2),
	"fee_currency" text DEFAULT 'IDR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departure_cities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "estimation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"estimation_id" integer NOT NULL,
	"category" text NOT NULL,
	"label" text NOT NULL,
	"detail" text,
	"unit" text,
	"unit_price" numeric(18, 2),
	"currency" text DEFAULT 'IDR' NOT NULL,
	"quantity" numeric(12, 2),
	"amount" numeric(18, 2) NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "estimation_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"estimation_id" integer NOT NULL,
	"source_currency" text NOT NULL,
	"target_currency" text DEFAULT 'IDR' NOT NULL,
	"rate" numeric(18, 6) NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "estimations" (
	"id" serial PRIMARY KEY NOT NULL,
	"estimation_number" text DEFAULT 'EST-' || lpad(nextval('estimation_seq')::text, 6, '0') NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"pilgrims" integer NOT NULL,
	"departure_city" text NOT NULL,
	"departure_date" date NOT NULL,
	"return_date" date NOT NULL,
	"duration_days" integer NOT NULL,
	"makkah_nights" integer NOT NULL,
	"madinah_nights" integer NOT NULL,
	"total_amount" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"per_person_amount" numeric(18, 2),
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estimations_estimation_number_unique" UNIQUE("estimation_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_currency" text NOT NULL,
	"target_currency" text DEFAULT 'IDR' NOT NULL,
	"rate" numeric(18, 6) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flights" (
	"id" serial PRIMARY KEY NOT NULL,
	"airline" text NOT NULL,
	"route_label" text DEFAULT 'CGK → JED' NOT NULL,
	"origin" text DEFAULT 'CGK' NOT NULL,
	"destination" text DEFAULT 'JED' NOT NULL,
	"flight_type" text DEFAULT 'Direct' NOT NULL,
	"baggage" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_room_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"hotel_id" integer NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"star_rating" integer DEFAULT 4 NOT NULL,
	"distance_label" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_image" text DEFAULT '' NOT NULL,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"whatsapp" text NOT NULL,
	"email" text,
	"origin" text DEFAULT 'service_inquiry' NOT NULL,
	"source" text,
	"service_id" integer,
	"estimation_id" integer,
	"notes" text,
	"status" text DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_estimation_unique" UNIQUE("estimation_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"priority" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_periods_priority_unique" UNIQUE("priority")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"period_id" integer NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"pricing_unit" text NOT NULL,
	"strategy" text DEFAULT 'manual' NOT NULL,
	"supplier_cost" numeric(18, 2),
	"markup_type" text,
	"markup_value" numeric(18, 2),
	"internal_notes" text,
	"selling_price" numeric(18, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'additional' NOT NULL,
	"pricing_unit" text DEFAULT 'pax' NOT NULL,
	"in_trip_builder" boolean DEFAULT false NOT NULL,
	"standalone" boolean DEFAULT false NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transport_route_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"vehicle_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transport_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"pickup" text NOT NULL,
	"destination" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transport_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	"luggage_label" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "estimation_items" ADD CONSTRAINT "estimation_items_estimation_id_estimations_id_fk" FOREIGN KEY ("estimation_id") REFERENCES "public"."estimations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "estimation_rates" ADD CONSTRAINT "estimation_rates_estimation_id_estimations_id_fk" FOREIGN KEY ("estimation_id") REFERENCES "public"."estimations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hotel_room_types" ADD CONSTRAINT "hotel_room_types_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_estimation_id_estimations_id_fk" FOREIGN KEY ("estimation_id") REFERENCES "public"."estimations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pricing_records" ADD CONSTRAINT "pricing_records_period_id_pricing_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."pricing_periods"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transport_route_vehicles" ADD CONSTRAINT "transport_route_vehicles_route_id_transport_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."transport_routes"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transport_route_vehicles" ADD CONSTRAINT "transport_route_vehicles_vehicle_id_transport_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."transport_vehicles"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "estimation_items_estimation_idx" ON "estimation_items" USING btree ("estimation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "estimation_rates_estimation_idx" ON "estimation_rates" USING btree ("estimation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exchange_rates_pair_idx" ON "exchange_rates" USING btree ("source_currency","target_currency");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "room_types_hotel_name_idx" ON "hotel_room_types" USING btree ("hotel_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotels_city_idx" ON "hotels" USING btree ("city");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pricing_entity_period_currency_idx" ON "pricing_records" USING btree ("entity_type","entity_id","period_id","currency");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "route_vehicles_route_vehicle_idx" ON "transport_route_vehicles" USING btree ("route_id","vehicle_id");