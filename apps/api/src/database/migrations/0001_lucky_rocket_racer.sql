ALTER TABLE "price_records" ADD COLUMN IF NOT EXISTS "original_price" numeric(10, 2);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stores_name_idx" ON "stores" USING btree ("name");