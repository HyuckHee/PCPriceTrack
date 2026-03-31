CREATE TABLE "pc_builds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(200) DEFAULT '나의 조립 PC' NOT NULL,
	"budget" numeric(10, 2) NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"total_price" numeric(10, 2),
	"components" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pc_builds" ADD CONSTRAINT "pc_builds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;