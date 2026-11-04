import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { callOutcomeEnum, urgencyLevelEnum } from "./enums";
import { vapiAgents } from "./vapi-agents";
import { customers } from "./customers";

export const calls = pgTable(
  "calls",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vapiAgentId: uuid("vapi_agent_id")
      .notNull()
      .references(() => vapiAgents.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    vapiCallId: text("vapi_call_id").notNull().unique(),
    callerPhone: text("caller_phone"),
    callerName: text("caller_name"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    // Minutes reported to Stripe for this call, and when (lib/billing/usage.ts).
    // Set once, so a retried webhook never bills a call twice.
    billedMinutes: integer("billed_minutes"),
    usageReportedAt: timestamp("usage_reported_at", { withTimezone: true }),
    outcome: callOutcomeEnum("outcome"),
    urgencyLevel: urgencyLevelEnum("urgency_level"),
    issueSummary: text("issue_summary"),
    serviceAddress: text("service_address"),
    // Industry-specific fields extracted from the call (e.g. matter_type,
    // patient_status), keyed by IntakeField.key from the customer's profile.
    intakeData: jsonb("intake_data").$type<Record<string, string>>(),
    transcript: text("transcript"),
    audioUrl: text("audio_url"),
    // Set when the owner was texted about this emergency — guarantees one alert
    // per call even if the model invokes the tool more than once.
    ownerAlertedAt: timestamp("owner_alerted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("calls_customer_started_idx").on(t.customerId, t.startedAt.desc()),
    index("calls_vapi_call_id_idx").on(t.vapiCallId),
    index("calls_outcome_idx").on(t.outcome),
  ]
);

export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
