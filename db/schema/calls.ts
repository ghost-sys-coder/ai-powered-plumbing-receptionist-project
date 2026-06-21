import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
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
    outcome: callOutcomeEnum("outcome"),
    urgencyLevel: urgencyLevelEnum("urgency_level"),
    issueSummary: text("issue_summary"),
    serviceAddress: text("service_address"),
    transcript: text("transcript"),
    audioUrl: text("audio_url"),
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
