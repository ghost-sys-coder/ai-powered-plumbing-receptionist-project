import { pgEnum } from "drizzle-orm/pg-core";

// admin  — platform staff (us); sees every agency.
// agency — staff of one agency (users.organization_id); sees only its customers.
// client — a business owner; sees only their own customer's dashboard.
// The authoritative role is Clerk publicMetadata.role (read from session
// claims); agency membership is read from users.organization_id.
export const userRoleEnum = pgEnum("user_role", ["admin", "client", "agency"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "paused",
]);

export const planEnum = pgEnum("plan", ["pilot", "standard"]);

export const customerStatusEnum = pgEnum("customer_status", [
  "onboarding",
  "active",
  "paused",
  "churned",
]);

export const vapiAgentStatusEnum = pgEnum("vapi_agent_status", [
  "active",
  "paused",
  "error",
]);

export const phoneNumberSourceEnum = pgEnum("phone_number_source", [
  "vapi_native",
  "twilio_imported",
]);

export const callOutcomeEnum = pgEnum("call_outcome", [
  "booked",
  "message_taken",
  "transferred",
  "dropped",
  "abandoned",
]);

export const urgencyLevelEnum = pgEnum("urgency_level", [
  "emergency",
  "urgent",
  "routine",
  "unknown",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "confirmed",
  "pending",
  "cancelled",
]);

export const calendarTypeEnum = pgEnum("calendar_type", [
  "google_calendar",
  "manual",
]);
