-- Migration: Tour Operations Phase 1 — Customers, Orders, Jamaah, Trips, Vendors, Bookings
CREATE SEQUENCE "public"."tour_customers_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."tour_orders_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."tour_jamaah_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."tour_trips_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."tour_vendors_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."tour_bookings_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tour_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"customer_code" text DEFAULT 'CUS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_customers_seq')::text, 4, '0') NOT NULL,
	"name" text NOT NULL,
	"whatsapp" text NOT NULL,
	"email" text,
	"city" text,
	"customer_type" text DEFAULT 'B2C_JAMAAH' NOT NULL,
	"source" text DEFAULT 'WHATSAPP' NOT NULL,
	"pic_user_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tour_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"order_code" text DEFAULT 'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_orders_seq')::text, 4, '0') NOT NULL,
	"order_date" date NOT NULL,
	"customer_id" integer NOT NULL,
	"lead_id" integer,
	"estimation_id" integer,
	"order_type" text DEFAULT 'UMRAH_PACKAGE' NOT NULL,
	"package_name" text,
	"service_summary" text DEFAULT '' NOT NULL,
	"pax_count" integer NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"selling_price_idr" numeric(18, 2) DEFAULT '0' NOT NULL,
	"pic_user_id" integer,
	"source" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tour_jamaah" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"jamaah_code" text DEFAULT 'JMH-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_jamaah_seq')::text, 4, '0') NOT NULL,
	"order_id" integer NOT NULL,
	"full_name" text NOT NULL,
	"gender" text,
	"birth_date" date,
	"passport_number" text,
	"passport_expiry" date,
	"visa_status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"siskopatuh_status" text DEFAULT 'PENDING' NOT NULL,
	"room_type" text DEFAULT 'NA' NOT NULL,
	"whatsapp" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tour_trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"trip_code" text DEFAULT 'TRIP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_trips_seq')::text, 4, '0') NOT NULL,
	"name" text NOT NULL,
	"departure_date" date NOT NULL,
	"return_date" date NOT NULL,
	"route_summary" text DEFAULT '' NOT NULL,
	"capacity" integer NOT NULL,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	"pic_user_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tour_trip_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"trip_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tour_vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"vendor_code" text DEFAULT 'VND-' || lpad(nextval('tour_vendors_seq')::text, 4, '0') NOT NULL,
	"name" text NOT NULL,
	"vendor_type" text NOT NULL,
	"contact_name" text,
	"whatsapp" text,
	"email" text,
	"city" text,
	"country" text,
	"default_currency" text DEFAULT 'IDR' NOT NULL,
	"payment_info" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tour_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"booking_code" text DEFAULT 'BKG-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_bookings_seq')::text, 4, '0') NOT NULL,
	"booking_date" date NOT NULL,
	"trip_id" integer,
	"order_id" integer,
	"vendor_id" integer NOT NULL,
	"booking_type" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"exchange_rate_snapshot" numeric(18, 6),
	"amount_idr" numeric(18, 2) NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"due_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint

-- Foreign keys
DO $$ BEGIN
 ALTER TABLE "tour_customers" ADD CONSTRAINT "tour_customers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_customers" ADD CONSTRAINT "tour_customers_pic_user_id_admin_users_id_fk" FOREIGN KEY ("pic_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_orders" ADD CONSTRAINT "tour_orders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_orders" ADD CONSTRAINT "tour_orders_customer_id_tour_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."tour_customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_orders" ADD CONSTRAINT "tour_orders_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_orders" ADD CONSTRAINT "tour_orders_estimation_id_estimations_id_fk" FOREIGN KEY ("estimation_id") REFERENCES "public"."estimations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_orders" ADD CONSTRAINT "tour_orders_pic_user_id_admin_users_id_fk" FOREIGN KEY ("pic_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_jamaah" ADD CONSTRAINT "tour_jamaah_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_jamaah" ADD CONSTRAINT "tour_jamaah_order_id_tour_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."tour_orders"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_trips" ADD CONSTRAINT "tour_trips_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_trips" ADD CONSTRAINT "tour_trips_pic_user_id_admin_users_id_fk" FOREIGN KEY ("pic_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_trip_orders" ADD CONSTRAINT "tour_trip_orders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_trip_orders" ADD CONSTRAINT "tour_trip_orders_trip_id_tour_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."tour_trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_trip_orders" ADD CONSTRAINT "tour_trip_orders_order_id_tour_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."tour_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_vendors" ADD CONSTRAINT "tour_vendors_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_trip_id_tour_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."tour_trips"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_order_id_tour_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."tour_orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_vendor_id_tour_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."tour_vendors"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "tour_customers_workspace_code_unique" ON "tour_customers" USING btree ("workspace_id","customer_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_customers_workspace_idx" ON "tour_customers" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_customers_type_idx" ON "tour_customers" USING btree ("customer_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_customers_source_idx" ON "tour_customers" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_customers_name_idx" ON "tour_customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_customers_whatsapp_idx" ON "tour_customers" USING btree ("whatsapp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_customers_deleted_idx" ON "tour_customers" USING btree ("deleted_at");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "tour_orders_workspace_code_unique" ON "tour_orders" USING btree ("workspace_id","order_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_orders_workspace_idx" ON "tour_orders" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_orders_customer_idx" ON "tour_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_orders_lead_idx" ON "tour_orders" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_orders_estimation_idx" ON "tour_orders" USING btree ("estimation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_orders_status_idx" ON "tour_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_orders_type_idx" ON "tour_orders" USING btree ("order_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_orders_date_idx" ON "tour_orders" USING btree ("order_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_orders_deleted_idx" ON "tour_orders" USING btree ("deleted_at");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "tour_jamaah_workspace_code_unique" ON "tour_jamaah" USING btree ("workspace_id","jamaah_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_jamaah_workspace_idx" ON "tour_jamaah" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_jamaah_order_idx" ON "tour_jamaah" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_jamaah_visa_idx" ON "tour_jamaah" USING btree ("visa_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_jamaah_sisko_idx" ON "tour_jamaah" USING btree ("siskopatuh_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_jamaah_name_idx" ON "tour_jamaah" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_jamaah_deleted_idx" ON "tour_jamaah" USING btree ("deleted_at");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "tour_trips_workspace_code_unique" ON "tour_trips" USING btree ("workspace_id","trip_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_trips_workspace_idx" ON "tour_trips" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_trips_status_idx" ON "tour_trips" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_trips_departure_idx" ON "tour_trips" USING btree ("departure_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_trips_deleted_idx" ON "tour_trips" USING btree ("deleted_at");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "tour_trip_orders_trip_order_unique" ON "tour_trip_orders" USING btree ("trip_id","order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_trip_orders_workspace_idx" ON "tour_trip_orders" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_trip_orders_trip_idx" ON "tour_trip_orders" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_trip_orders_order_idx" ON "tour_trip_orders" USING btree ("order_id");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "tour_vendors_workspace_code_unique" ON "tour_vendors" USING btree ("workspace_id","vendor_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_vendors_workspace_idx" ON "tour_vendors" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_vendors_type_idx" ON "tour_vendors" USING btree ("vendor_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_vendors_status_idx" ON "tour_vendors" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_vendors_name_idx" ON "tour_vendors" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_vendors_deleted_idx" ON "tour_vendors" USING btree ("deleted_at");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "tour_bookings_workspace_code_unique" ON "tour_bookings" USING btree ("workspace_id","booking_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_bookings_workspace_idx" ON "tour_bookings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_bookings_trip_idx" ON "tour_bookings" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_bookings_order_idx" ON "tour_bookings" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_bookings_vendor_idx" ON "tour_bookings" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_bookings_status_idx" ON "tour_bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_bookings_type_idx" ON "tour_bookings" USING btree ("booking_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_bookings_date_idx" ON "tour_bookings" USING btree ("booking_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tour_bookings_deleted_idx" ON "tour_bookings" USING btree ("deleted_at");--> statement-breakpoint
