ALTER TABLE "vapi_agents" ADD COLUMN "alert_phone" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "owner_alerted_at" timestamp with time zone;