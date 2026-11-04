ALTER TABLE "customers" ADD COLUMN "industry" text DEFAULT 'plumbing' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "country" text DEFAULT 'US' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "business_description" text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "intake_data" jsonb;