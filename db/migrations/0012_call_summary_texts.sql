ALTER TABLE "vapi_agents" ADD COLUMN "call_summary_texts" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "summary_texted_at" timestamp with time zone;