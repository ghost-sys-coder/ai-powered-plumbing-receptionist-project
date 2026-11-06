import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vapiAgentStatusEnum, phoneNumberSourceEnum, calendarTypeEnum } from "./enums";
import { customers } from "./customers";

export const vapiAgents = pgTable(
  "vapi_agents",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    // Which voice platform runs this receptionist (lib/voice VoiceProviderId).
    // The two id columns below hold that provider's agent and phone-number ids;
    // they keep their original "vapi_" names to avoid a rename migration.
    provider: text("provider").notNull().default("vapi"),
    vapiAssistantId: text("vapi_assistant_id").notNull().unique(),
    vapiPhoneNumberId: text("vapi_phone_number_id"),
    phoneNumber: text("phone_number"),
    phoneNumberSource: phoneNumberSourceEnum("phone_number_source")
      .notNull()
      .default("vapi_native"),
    status: vapiAgentStatusEnum("status").notNull().default("active"),
    // Set when billing switched this receptionist off (unpaid / cancelled), so
    // only those are switched back on when payment resumes — never one staff
    // paused by hand.
    billingSuspendedAt: timestamp("billing_suspended_at", { withTimezone: true }),
    servicesOffered: jsonb("services_offered"),
    pricingTable: jsonb("pricing_table"),
    businessHours: jsonb("business_hours"),
    emergencyDefinition: text("emergency_definition"),
    ownerName: text("owner_name"),
    calendarId: text("calendar_id"),
    calendarType: calendarTypeEnum("calendar_type")
      .notNull()
      .default("google_calendar"),
    appointmentDurationMinutes: integer("appointment_duration_minutes")
      .notNull()
      .default(120),
    appointmentBufferMinutes: integer("appointment_buffer_minutes")
      .notNull()
      .default(30),
    // Minimum notice before a bookable slot: standard jobs, and jobs the AI has
    // flagged as emergencies (shorter, so urgent callers get the soonest visit).
    minLeadMinutes: integer("min_lead_minutes").notNull().default(120),
    emergencyLeadMinutes: integer("emergency_lead_minutes").notNull().default(60),
    // Mobile (E.164) texted the moment the AI flags an emergency. No alert is
    // sent when unset.
    alertPhone: text("alert_phone"),
    // Live transfer: on an emergency the AI offers to connect the caller to the
    // owner (warm transfer — owner is briefed first; if they don't answer the AI
    // stays on and books). Number falls back to alertPhone. Off by default.
    transferEnabled: boolean("transfer_enabled").notNull().default(false),
    transferPhone: text("transfer_phone"),
    transferAfterHours: boolean("transfer_after_hours").notNull().default(false),
    // Opt-in: text the alert phone a short summary after every call (not just
    // emergencies). Off by default so nobody starts getting texts unasked.
    callSummaryTexts: boolean("call_summary_texts").notNull().default(false),
    // Settings health (lib/services/receptionist-health). The app is the source
    // of truth for the agent's settings on the voice platform; a save in that
    // platform's dashboard can silently drop some of them. Checked daily and
    // after any call that comes back with no captured details.
    configCheckedAt: timestamp("config_checked_at", { withTimezone: true }),
    // Last time a check found changes and pushed our settings back, and what
    // it found.
    configRepairedAt: timestamp("config_repaired_at", { withTimezone: true }),
    configRepairedProblems: jsonb("config_repaired_problems").$type<string[]>(),
    // Set while the agent is known to be wrong and the repair failed; cleared
    // by the next healthy check.
    configError: text("config_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("vapi_agents_customer_id_idx").on(t.customerId),
    index("vapi_agents_vapi_assistant_id_idx").on(t.vapiAssistantId),
  ]
);

export type VapiAgent = typeof vapiAgents.$inferSelect;
export type NewVapiAgent = typeof vapiAgents.$inferInsert;
