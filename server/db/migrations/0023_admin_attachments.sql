-- Admin private attachments for Payment/Expense proof (V1.1)
CREATE TABLE IF NOT EXISTS "admin_attachments" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspace_id" integer NOT NULL REFERENCES "workspaces"("id") ON DELETE RESTRICT,
  "entity_type" text NOT NULL,
  "entity_id" integer NOT NULL,
  "file_name" text NOT NULL,
  "original_name" text NOT NULL,
  "storage_key" text NOT NULL UNIQUE,
  "mime_type" text NOT NULL,
  "file_size" integer NOT NULL,
  "uploaded_by" integer REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "admin_attachments_workspace_idx" ON "admin_attachments" ("workspace_id");
CREATE INDEX IF NOT EXISTS "admin_attachments_entity_idx" ON "admin_attachments" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "admin_attachments_workspace_entity_idx" ON "admin_attachments" ("workspace_id", "entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "admin_attachments_deleted_idx" ON "admin_attachments" ("deleted_at");
