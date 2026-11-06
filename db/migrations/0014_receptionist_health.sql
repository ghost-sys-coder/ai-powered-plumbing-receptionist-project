ALTER TABLE "vapi_agents" ADD COLUMN "config_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vapi_agents" ADD COLUMN "config_repaired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vapi_agents" ADD COLUMN "config_repaired_problems" jsonb;--> statement-breakpoint
ALTER TABLE "vapi_agents" ADD COLUMN "config_error" text;