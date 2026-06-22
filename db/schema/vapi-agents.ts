import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vapiAgentStatusEnum, phoneNumberSourceEnum } from "./enums";
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
    vapiAssistantId: text("vapi_assistant_id").notNull().unique(),
    vapiPhoneNumberId: text("vapi_phone_number_id"),
    phoneNumber: text("phone_number"),
    phoneNumberSource: phoneNumberSourceEnum("phone_number_source")
      .notNull()
      .default("vapi_native"),
    status: vapiAgentStatusEnum("status").notNull().default("active"),
    servicesOffered: jsonb("services_offered"),
    pricingTable: jsonb("pricing_table"),
    businessHours: jsonb("business_hours"),
    emergencyDefinition: text("emergency_definition"),
    ownerName: text("owner_name"),
    calendarId: text("calendar_id"),
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
