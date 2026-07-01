CREATE TYPE "public"."booking_status" AS ENUM('confirmed', 'pending', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."calendar_type" AS ENUM('google_calendar', 'manual');--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "scheduled_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vapi_agents" ADD COLUMN "calendar_type" "calendar_type" DEFAULT 'google_calendar' NOT NULL;--> statement-breakpoint
ALTER TABLE "vapi_agents" ADD COLUMN "appointment_duration_minutes" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "vapi_agents" ADD COLUMN "appointment_buffer_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "status" "booking_status" DEFAULT 'confirmed' NOT NULL;
