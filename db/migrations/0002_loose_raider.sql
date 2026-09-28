ALTER TABLE "vapi_agents" ADD COLUMN "min_lead_minutes" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "vapi_agents" ADD COLUMN "emergency_lead_minutes" integer DEFAULT 60 NOT NULL;