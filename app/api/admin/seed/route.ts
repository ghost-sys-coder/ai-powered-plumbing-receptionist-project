import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/db/drizzle";
import { customers, vapiAgents, calls, bookings } from "@/db/schema";

const HIGHTOWER_EMAIL = "ecommercedock@gmail.com";
const SEED_ASSISTANT_ID = "seed_demo_hightower_assistant";

type Caller = {
  name: string | null;
  phone: string;
  address: string | null;
  issue: string;
  urgency: "emergency" | "urgent" | "routine" | "unknown";
  outcome: "booked" | "message_taken" | "transferred" | "dropped" | "abandoned";
  startedAt: Date;
  durationSeconds: number;
  bookingAt: Date | null;
};

const callers: Caller[] = [
  {
    name: "Marcus Webb",
    phone: "+18135559182",
    address: "4821 Cypress Run Dr, Tampa",
    issue: "Water dripping from under the kitchen sink for two days, not getting worse.",
    urgency: "routine",
    outcome: "booked",
    startedAt: new Date("2026-06-22T14:32:00.000Z"),
    durationSeconds: 227,
    bookingAt: new Date("2026-06-25T12:00:00.000Z"),
  },
  {
    name: "Dave Kowalski",
    phone: "+18135554401",
    address: "902 Palmetto Blvd, Tampa",
    issue: "Basement actively flooding, caller reporting fast water intrusion.",
    urgency: "emergency",
    outcome: "message_taken",
    startedAt: new Date("2026-06-22T02:14:00.000Z"),
    durationSeconds: 202,
    bookingAt: null,
  },
  {
    name: "Linda Torres",
    phone: "+18135552209",
    address: "1103 Bayside Ave, Tampa",
    issue: "Slow shower drain backing up, water sitting at ankle level after showers.",
    urgency: "routine",
    outcome: "booked",
    startedAt: new Date("2026-06-21T11:08:00.000Z"),
    durationSeconds: 168,
    bookingAt: new Date("2026-06-23T17:00:00.000Z"),
  },
  {
    name: "James Okafor",
    phone: "+18135558834",
    address: "307 Lemon St, Tampa",
    issue: "No hot water since this morning, tank looks fine externally.",
    urgency: "urgent",
    outcome: "booked",
    startedAt: new Date("2026-06-21T18:42:00.000Z"),
    durationSeconds: 196,
    bookingAt: new Date("2026-06-23T13:00:00.000Z"),
  },
  {
    name: "Patricia Nguyen",
    phone: "+18135553317",
    address: "88 Harbour Island Blvd, Tampa",
    issue: "Dripping kitchen faucet, slow steady drip even when handle is fully closed.",
    urgency: "routine",
    outcome: "booked",
    startedAt: new Date("2026-06-20T10:15:00.000Z"),
    durationSeconds: 142,
    bookingAt: new Date("2026-06-26T14:00:00.000Z"),
  },
  {
    name: null,
    phone: "+18135557723",
    address: null,
    issue: "Caller hung up mid-sentence before issue could be captured.",
    urgency: "unknown",
    outcome: "dropped",
    startedAt: new Date("2026-06-19T12:33:00.000Z"),
    durationSeconds: 23,
    bookingAt: null,
  },
  {
    name: "Steve Marinelli",
    phone: "+18135556621",
    address: "2240 Bayshore Blvd, Tampa",
    issue: "Running toilet that won't stop refilling, master bathroom.",
    urgency: "routine",
    outcome: "booked",
    startedAt: new Date("2026-06-18T16:48:00.000Z"),
    durationSeconds: 154,
    bookingAt: new Date("2026-06-29T18:00:00.000Z"),
  },
  {
    name: "Carol Hutchins",
    phone: "+18135551198",
    address: "540 W Kennedy Blvd, Tampa",
    issue: "Wants a quote for a tankless water heater replacement, no current issue.",
    urgency: "routine",
    outcome: "message_taken",
    startedAt: new Date("2026-06-17T09:22:00.000Z"),
    durationSeconds: 134,
    bookingAt: null,
  },
  {
    name: "Tony Reyes",
    phone: "+18135555509",
    address: "19 Davis Islands Blvd, Tampa",
    issue: "Only toilet in the house won't flush, can't use it tonight.",
    urgency: "urgent",
    outcome: "booked",
    startedAt: new Date("2026-06-16T22:11:00.000Z"),
    durationSeconds: 211,
    bookingAt: new Date("2026-06-24T13:00:00.000Z"),
  },
  {
    name: null,
    phone: "+18135559947",
    address: null,
    issue: "Caller dropped off the line before stating their issue.",
    urgency: "unknown",
    outcome: "dropped",
    startedAt: new Date("2026-06-15T14:55:00.000Z"),
    durationSeconds: 41,
    bookingAt: null,
  },
  {
    name: "Margaret Chen",
    phone: "+18135553382",
    address: "4402 Henderson Blvd, Tampa",
    issue: "Pipe under the crawl space is leaking, worried about damage.",
    urgency: "urgent",
    outcome: "message_taken",
    startedAt: new Date("2026-06-14T08:34:00.000Z"),
    durationSeconds: 188,
    bookingAt: null,
  },
  {
    name: "Robert Ellis",
    phone: "+18135557741",
    address: "6601 N Nebraska Ave, Tampa",
    issue: "Wants a quote for replacing a 12-year-old water heater.",
    urgency: "routine",
    outcome: "booked",
    startedAt: new Date("2026-06-13T13:20:00.000Z"),
    durationSeconds: 246,
    bookingAt: new Date("2026-07-01T14:00:00.000Z"),
  },
  {
    name: "Dawn Petersen",
    phone: "+18135554423",
    address: "211 S Dale Mabry Hwy, Tampa",
    issue: "Sewer smell in the basement on and off for a week.",
    urgency: "urgent",
    outcome: "transferred",
    startedAt: new Date("2026-06-11T19:48:00.000Z"),
    durationSeconds: 64,
    bookingAt: null,
  },
  {
    name: "Frank Castillo",
    phone: "+18135558856",
    address: "3301 Swann Ave, Tampa",
    issue: "Wants the kitchen faucet replaced with one he already has on site.",
    urgency: "routine",
    outcome: "message_taken",
    startedAt: new Date("2026-06-09T11:05:00.000Z"),
    durationSeconds: 121,
    bookingAt: null,
  },
];

async function wipeHightower(): Promise<void> {
  const existing = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.email, HIGHTOWER_EMAIL))
    .limit(1);

  if (existing.length === 0) return;

  const customerId = existing[0].id;

  const customerCalls = await db
    .select({ id: calls.id })
    .from(calls)
    .where(eq(calls.customerId, customerId));

  if (customerCalls.length > 0) {
    const callIds = customerCalls.map((c) => c.id);
    await db.delete(bookings).where(inArray(bookings.callId, callIds));
  }

  await db.delete(calls).where(eq(calls.customerId, customerId));
  await db.delete(vapiAgents).where(eq(vapiAgents.customerId, customerId));
  await db.delete(customers).where(eq(customers.id, customerId));
}

// POST — seed Hightower demo data (wipes first so it's idempotent)
export async function POST() {
  await requireAdmin();

  await wipeHightower();

  const [customer] = await db
    .insert(customers)
    .values({
      businessName: "Hightower Plumbing",
      ownerName: "Ray Hightower",
      email: HIGHTOWER_EMAIL,
      phone: "+18135550192",
      city: "Tampa",
      state: "FL",
      timezone: "America/New_York",
      serviceArea: "Hillsborough County",
      plan: "pilot",
      status: "active",
      subscriptionStatus: "active",
      onboardedAt: new Date("2026-06-01T13:00:00.000Z"),
    })
    .returning({ id: customers.id });

  const [agent] = await db
    .insert(vapiAgents)
    .values({
      customerId: customer.id,
      vapiAssistantId: SEED_ASSISTANT_ID,
      phoneNumber: "+18135550192",
      phoneNumberSource: "vapi_native",
      status: "active",
      ownerName: "Ray Hightower",
      emergencyDefinition:
        "Active flooding, burst pipe, no water in house, sewage backup, gas smell",
      businessHours: {
        Monday:    { open: "07:00", close: "17:00", closed: false },
        Tuesday:   { open: "07:00", close: "17:00", closed: false },
        Wednesday: { open: "07:00", close: "17:00", closed: false },
        Thursday:  { open: "07:00", close: "17:00", closed: false },
        Friday:    { open: "07:00", close: "17:00", closed: false },
        Saturday:  { open: "08:00", close: "13:00", closed: false },
        Sunday:    { open: "",      close: "",       closed: true  },
      },
      servicesOffered: [
        { name: "Leak repair",                  price: "$150–$350" },
        { name: "Drain cleaning",               price: "$99–$199"  },
        { name: "Water heater replacement",     price: "$800–$1,400" },
        { name: "Toilet repair",                price: "$120–$250" },
        { name: "Faucet repair or replacement", price: "$85–$200"  },
        { name: "Pipe repair",                  price: "$200–$600" },
        { name: "Emergency call-out",           price: "$150 after-hours surcharge" },
      ],
      pricingTable: {
        serviceCallFee:      "$89",
        hourlyRate:          "$110",
        afterHoursSurcharge: "$150",
        freeEstimates:       false,
      },
    })
    .returning({ id: vapiAgents.id });

  const callRows = await db
    .insert(calls)
    .values(
      callers.map((c, i) => ({
        vapiCallId: `seed_hightower_${(i + 1).toString().padStart(3, "0")}`,
        vapiAgentId: agent.id,
        customerId: customer.id,
        callerPhone: c.phone,
        callerName: c.name,
        startedAt: c.startedAt,
        endedAt: new Date(c.startedAt.getTime() + c.durationSeconds * 1000),
        durationSeconds: c.durationSeconds,
        outcome: c.outcome,
        urgencyLevel: c.urgency,
        issueSummary: c.issue,
        serviceAddress: c.address,
        transcript: `[seed] ${c.issue}`,
      }))
    )
    .returning({ id: calls.id });

  const bookingValues = callers
    .map((c, i) => ({ caller: c, callId: callRows[i].id }))
    .filter(({ caller }) => caller.outcome === "booked")
    .map(({ caller, callId }) => ({
      callId,
      customerId: customer.id,
      scheduledAt: caller.bookingAt,
      notes: null as string | null,
    }));

  if (bookingValues.length > 0) {
    await db.insert(bookings).values(bookingValues);
  }

  return NextResponse.json({
    success: true,
    customerId: customer.id,
    calls: callRows.length,
    bookings: bookingValues.length,
  });
}

// DELETE — wipe Hightower demo data only
export async function DELETE() {
  await requireAdmin();
  await wipeHightower();
  return NextResponse.json({ success: true });
}
