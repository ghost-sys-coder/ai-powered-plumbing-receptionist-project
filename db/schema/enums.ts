import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "client"]);

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
