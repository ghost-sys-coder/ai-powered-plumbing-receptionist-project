ALTER TABLE "vapi_agents" ADD COLUMN "transfer_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vapi_agents" ADD COLUMN "transfer_phone" text;--> statement-breakpoint
ALTER TABLE "vapi_agents" ADD COLUMN "transfer_after_hours" boolean DEFAULT false NOT NULL;