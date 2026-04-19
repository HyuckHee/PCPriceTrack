CREATE TYPE "public"."spec_extraction_status" AS ENUM('pending', 'parsed', 'llm', 'failed');--> statement-breakpoint
CREATE TYPE "public"."benchmark_score_type" AS ENUM('cpu_mark', 'cpu_single_thread', 'g3d_mark', 'time_spy', 'port_royal', 'fire_strike', 'multi_core', 'single_core');--> statement-breakpoint
CREATE TYPE "public"."benchmark_source" AS ENUM('passmark', '3dmark', 'cinebench', 'geekbench', 'userbenchmark', 'manual');--> statement-breakpoint
CREATE TABLE "benchmark_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"source" "benchmark_source" NOT NULL,
	"score_type" "benchmark_score_type" NOT NULL,
	"score" integer NOT NULL,
	"source_product_name" varchar(300),
	"source_url" varchar(500),
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "performance_score" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "single_thread_score" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "spec_extraction_status" "spec_extraction_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "spec_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "benchmark_scores" ADD CONSTRAINT "benchmark_scores_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "benchmark_scores_product_idx" ON "benchmark_scores" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "benchmark_scores_source_type_idx" ON "benchmark_scores" USING btree ("source","score_type");--> statement-breakpoint
CREATE UNIQUE INDEX "benchmark_scores_uniq" ON "benchmark_scores" USING btree ("product_id","source","score_type");--> statement-breakpoint
CREATE INDEX "products_performance_score_idx" ON "products" USING btree ("performance_score");