CREATE TYPE "public"."call_outcome" AS ENUM('booked', 'message_taken', 'transferred', 'dropped', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('onboarding', 'active', 'paused', 'churned');--> statement-breakpoint
CREATE TYPE "public"."phone_number_source" AS ENUM('vapi_native', 'twilio_imported');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('pilot', 'standard');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'paused');--> statement-breakpoint
CREATE TYPE "public"."urgency_level" AS ENUM('emergency', 'urgent', 'routine', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'client');--> statement-breakpoint
CREATE TYPE "public"."vapi_agent_status" AS ENUM('active', 'paused', 'error');--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"owner_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"service_area" text,
	"stripe_customer_id" text,
	"subscription_status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"plan" "plan" DEFAULT 'standard' NOT NULL,
	"status" "customer_status" DEFAULT 'onboarding' NOT NULL,
	"onboarded_at" timestamp with time zone,
	"churned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"organization_id" uuid,
	"customer_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "vapi_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"vapi_assistant_id" text NOT NULL,
	"vapi_phone_number_id" text,
	"phone_number" text,
	"phone_number_source" "phone_number_source" DEFAULT 'vapi_native' NOT NULL,
	"status" "vapi_agent_status" DEFAULT 'active' NOT NULL,
	"services_offered" jsonb,
	"pricing_table" jsonb,
	"business_hours" jsonb,
	"emergency_definition" text,
	"owner_name" text,
	"calendar_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vapi_agents_vapi_assistant_id_unique" UNIQUE("vapi_assistant_id")
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vapi_agent_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"vapi_call_id" text NOT NULL,
	"caller_phone" text,
	"caller_name" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"outcome" "call_outcome",
	"urgency_level" "urgency_level",
	"issue_summary" text,
	"service_address" text,
	"transcript" text,
	"audio_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calls_vapi_call_id_unique" UNIQUE("vapi_call_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"calendar_event_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_call_id_unique" UNIQUE("call_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vapi_agents" ADD CONSTRAINT "vapi_agents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_vapi_agent_id_vapi_agents_id_fk" FOREIGN KEY ("vapi_agent_id") REFERENCES "public"."vapi_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_stripe_customer_id_idx" ON "customers" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "customers_status_idx" ON "customers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "users_customer_id_idx" ON "users" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "vapi_agents_customer_id_idx" ON "vapi_agents" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "vapi_agents_vapi_assistant_id_idx" ON "vapi_agents" USING btree ("vapi_assistant_id");--> statement-breakpoint
CREATE INDEX "calls_customer_started_idx" ON "calls" USING btree ("customer_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "calls_vapi_call_id_idx" ON "calls" USING btree ("vapi_call_id");--> statement-breakpoint
CREATE INDEX "calls_outcome_idx" ON "calls" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "bookings_customer_scheduled_idx" ON "bookings" USING btree ("customer_id","scheduled_at");