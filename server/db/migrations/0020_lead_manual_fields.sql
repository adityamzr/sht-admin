-- Add manual lead fields: pax estimate and extended source handling
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "pax_estimate" integer;--> statement-breakpoint
-- Ensure source can hold manual sources (already text, no enum constraint)
-- Add index for whatsapp for dedup warning
CREATE INDEX IF NOT EXISTS "leads_whatsapp_idx" ON "leads" USING btree ("whatsapp");--> statement-breakpoint
