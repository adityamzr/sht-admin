ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "avatar_file_id" text;
CREATE TABLE IF NOT EXISTS "notifications" ("id" serial PRIMARY KEY NOT NULL,"recipient_user_id" integer NOT NULL,"workspace_id" integer NOT NULL,"type" text NOT NULL,"title" text NOT NULL,"message" text NOT NULL,"href" text,"read_at" timestamptz,"created_at" timestamptz DEFAULT now() NOT NULL);
DO $$ BEGIN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_admin_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "admin_users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "notifications_recipient_workspace_idx" ON "notifications" USING btree ("recipient_user_id","workspace_id","created_at");
