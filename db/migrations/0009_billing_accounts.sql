CREATE TABLE "billing_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"customer_id" uuid,
	"organization_id" uuid,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"currency" text,
	"status" text DEFAULT 'none' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_accounts_customer_id_unique" UNIQUE("customer_id"),
	CONSTRAINT "billing_accounts_organization_id_unique" UNIQUE("organization_id"),
	CONSTRAINT "billing_accounts_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "billing_accounts_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "vapi_agents" ADD COLUMN "billing_suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "billed_minutes" integer;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "usage_reported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_accounts_status_idx" ON "billing_accounts" USING btree ("status");