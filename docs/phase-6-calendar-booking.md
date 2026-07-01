# Phase 6: Google Calendar Booking Integration

> Instruction file for Claude Code. Read this entire document before making any changes.
> Coding standards from `docs/phase-1-foundation.md` apply to all code in this session.
> Do not touch client dashboard files or the marketing page during this session.

## Context

This phase adds real-time calendar booking to the Vapi AI agent. The assistant
checks availability and books appointments directly into a Google Calendar during
a live call. Every booking is written to both Google Calendar and the `bookings`
table in your DB.

Architecture: custom Vapi function tools, not Vapi's native Google Calendar
integration. Reasons: collision safety, DB sync, automated provisioning, full control.

---

## Codebase constraints (read first — these caused the v1 draft to be wrong)

These are facts about THIS repo. Honour them or the integration breaks:

1. **Middleware lives in `proxy.ts`, not `middleware.ts`.** Public routes are
   declared with `createRouteMatcher` in [`proxy.ts`](../proxy.ts). There is no
   `middleware.ts`.
2. **`bookings.call_id` is `NOT NULL`, `UNIQUE`, and FKs to `calls.id`.** A booking
   cannot be inserted without a real internal call id. See Task 4 for how the tool
   resolves it. (`calls.id` is our UUID — NOT the Vapi call id.)
3. **The system prompt is `model.messages[{role:"system"}].content`** — there is no
   `model.systemPrompt` field. Always go through the existing SDK wrapper
   [`updateVapiAssistant()`](../lib/services/vapi-provisioning.ts), never a raw PATCH.
4. **Timezone lives on `customers.timezone`, not `vapi_agents`.** All slot math must
   use it or bookings land in the wrong hour (the exact bug fixed in Phase 5).
5. **`vapi_agents.calendar_id` and `bookings.calendar_event_id` already exist** as
   columns — reuse them, do not re-add.
6. **Do NOT configure assistants in the Vapi dashboard.** A dashboard save previously
   stripped `structuredDataMultiPlan` and silently broke structured data. Code is the
   single source of truth; push everything (prompt, analysis plan, tools) via
   [`scripts/sync-vapi-analysis.ts`](../scripts/sync-vapi-analysis.ts).
7. **`createVapiAssistant()` runs `verifyAnalysisPlan()` after create.** Adding `tools`
   to the create payload is fine; just don't remove that read-back guard.

---

## Task 1: Schema migration

Two new fields on `vapi_agents` (plus one calendar-type field), one new field on
`bookings`. Note `vapi_agents.calendar_id` and `bookings.calendar_event_id` already
exist — do not re-add them.

### `vapi_agents` additions

```text
appointment_duration_minutes: integer NOT NULL DEFAULT 120
appointment_buffer_minutes:   integer NOT NULL DEFAULT 30
calendar_type:                calendar_type NOT NULL DEFAULT 'google_calendar'
```

Admin-controlled per customer. Defaults apply to all existing rows via DEFAULT.

### `bookings` addition

```text
status: booking_status NOT NULL DEFAULT 'confirmed'
```

### Enums — add to `db/schema/enums.ts`

```typescript
export const bookingStatus = pgEnum('booking_status', [
  'confirmed',
  'pending',
  'cancelled',
]);

export const calendarType = pgEnum('calendar_type', [
  'google_calendar',
  'manual',
]);
```

Update `db/schema/vapi-agents.ts` (duration, buffer, calendar_type) and
`db/schema/bookings.ts` (status).

### Migration (use the repo's migration-file workflow, not `push`)

```bash
npx drizzle-kit generate    # writes a migration file to db/migrations
npx drizzle-kit migrate     # applies it — keeps migration history consistent
```

Verify the new columns in Neon before proceeding.

---

## Task 2: Admin form + agent-config editing

### New customer provisioning form

In `components/admin/new-customer-form.tsx`, add to the Agent config section:

**Appointment duration:** number, min 30, max 480, step 30, default 120 —
help text "How long to block on the calendar per booking".

**Appointment buffer:** number, min 0, max 120, step 15, default 30 —
help text "Travel/prep time between jobs".

**Calendar integration (select):**

- `google_calendar` → "Google Calendar (direct booking)" — show the `calendar_id` field
- `manual` → "Manual scheduling (AI takes messages)" — hide `calendar_id`
- Default: `google_calendar`

Also include these in the JSON sample template so "Fill from JSON" populates them.

### Customer detail / edit page

In `components/admin/customer-agent-card.tsx`, display: appointment duration,
buffer, and a calendar-type badge ("Google Calendar" / "Manual").

Add an **"Edit agent config"** button opening a modal with editable duration,
buffer, `calendar_id`, and `calendar_type`.

> **Note:** there is no `components/ui/dialog.tsx` yet (only `alert-dialog` and
> `sheet`). Add the shadcn Dialog first (`npx shadcn@latest add dialog`) or reuse
> the existing `sheet` component. Do not hand-roll a modal.

### New route: `app/api/admin/customers/[id]/agent/route.ts` (PATCH)

- `await requireAdmin()`
- Validate body (duration, buffer, calendar_id, calendar_type)
- Update the `vapi_agents` row
- Rebuild `ProvisioningConfig` from the updated row + customer, then call
  **`updateVapiAssistant(vapiAssistantId, config)`** — this regenerates the system
  prompt AND re-attaches tools via the SDK (correct `model.messages` shape). Do NOT
  hand-roll a `fetch` PATCH with `model.systemPrompt` — that field does not exist.
- Return 200

This is the "Update agent config" feature; it's required because calendar config
changes must propagate to the assistant prompt and tools.

---

## Task 3: Google Calendar client

Create `lib/google/calendar-client.ts` — initialises a Calendar API client from
service-account credentials. (Service account, not per-client OAuth: each client
shares their calendar with the service-account email. This avoids OAuth token
storage and Google's sensitive-scope verification.)

```typescript
import { google } from "googleapis";

function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth });
}

export { getCalendarClient };
```

```bash
npm install googleapis
```

The `private_key` replace handles Vercel storing `\n` as literal backslash-n.

---

## Task 4: Availability service

Create `lib/services/calendar-availability.ts`. Define the slot policy constants at
the top (lead time + window are global for v1; duration/buffer are per-customer):

```typescript
const MIN_LEAD_MINUTES = 120;   // don't offer a slot sooner than 2h out
const BOOKING_WINDOW_DAYS = 14; // how far ahead to offer
```

### `getAvailableSlots`

```typescript
type GetAvailableSlotsInput = {
  calendarId: string;
  durationMinutes: number;
  bufferMinutes: number;
  customerId: string;
  timezone: string;          // REQUIRED — from customers.timezone
  businessHours: unknown;    // vapi_agents.business_hours JSON
  fromDate?: Date;           // defaults to now
};

type TimeSlot = {
  start: Date;
  end: Date;
  startIso: string;          // exact ISO with offset — the AI echoes this back
  label: string;             // "Thursday, July 3, 9:00–11:00 AM"
};

async function getAvailableSlots(input: GetAvailableSlotsInput): Promise<TimeSlot[]>;
```

Logic:

1. Window: `fromDate` (default now) → `fromDate + BOOKING_WINDOW_DAYS`.
2. Google Calendar `freebusy` query for busy periods on `calendarId`.
3. Query the `bookings` table for `status = 'confirmed'` rows for this `customerId`
   in the same window (belt-and-suspenders against DB/calendar drift).
4. Busy = union of both sets.
5. Generate candidate slots, **all computed in `input.timezone`**:
   - Only within business hours (parse `businessHours`, interpreted in `timezone`).
   - Slot length = `durationMinutes`; gap between jobs = `bufferMinutes`.
   - Start on the hour/half-hour only.
   - Skip any start within `MIN_LEAD_MINUTES` of now.
6. Drop candidates overlapping any busy period.
7. Return the first 6.
8. Each slot carries both `startIso` (machine-readable) and `label` (spoken).

### `bookSlot`

```typescript
type BookSlotInput = {
  calendarId: string;
  customerId: string;
  vapiAgentId: string;
  callId: string;            // resolved internal calls.id (see Task 5) — NOT optional
  slot: { start: Date; end: Date };
  callerName: string | null;
  callerPhone: string | null;
  issueSummary: string | null;
  serviceAddress: string | null;
};

type BookSlotResult = {
  success: boolean;
  calendarEventId: string | null;
  scheduledAt: Date;
  error?: string;
};

async function bookSlot(input: BookSlotInput): Promise<BookSlotResult>;
```

Logic:

1. **Targeted collision re-check** — run a `freebusy` query for *exactly*
   `[slot.start, slot.end]` (and check the `bookings` table for an overlap on that
   window). Do NOT rely on `getAvailableSlots` (it only returns the first 6 and may
   not include the requested slot). If busy → `{ success: false, error: "That time is
   no longer available" }`.
2. Create the Google Calendar event:
   - Title: `Plumbing job — [callerName ?? "Customer"]`
   - Description: issue summary + service address + caller phone
   - Start/end from slot; `sendUpdates: 'none'`.
3. Insert into `bookings`:
   - `callId`: `input.callId` (real internal id — satisfies the NOT NULL/UNIQUE FK)
   - `customerId`, `scheduledAt` = slot start, `calendarEventId` from Google,
     `status: 'confirmed'`, `notes` = formatted summary.
   - Use `onConflictDoNothing` on `call_id` so a retried tool call is idempotent.
4. Return success with `calendarEventId` and `scheduledAt`.

### Error handling

Wrap all Google calls in try/catch, log with `[calendar-availability]`:

- `getAvailableSlots` → return `[]` on failure.
- `bookSlot` → return `{ success: false, error: "Calendar unavailable" }`.
- Never let a Calendar error crash the tool endpoint.

---

## Task 5: Vapi tool endpoints

Two routes Vapi calls as function tools mid-call. They are hit by Vapi's servers,
not authenticated users.

**Public-route registration:** add both paths to the `isPublic` matcher in
**`proxy.ts`** (NOT `middleware.ts` — it does not exist). e.g. add
`"/api/vapi/tools/(.*)"` to `createRouteMatcher`.

**Signature verification:** these endpoints create real calendar events, so verify
the `x-vapi-signature` header exactly like
[`app/api/webhooks/vapi/route.ts`](../app/api/webhooks/vapi/route.ts) (respect
`SKIP_VAPI_SIGNATURE_VERIFY` in dev). Extract the existing `verifySignature` helper
into `lib/vapi/verify-signature.ts` and reuse it in both the webhook and these
routes.

Vapi tool-call payload:

```json
{
  "message": {
    "type": "tool-calls",
    "toolCallList": [{
      "id": "call_abc123",
      "function": { "name": "check_availability", "arguments": "{\"preferred_date\":\"Thursday\"}" }
    }],
    "call": { "id": "vapi_call_xyz", "assistantId": "asst_abc" }
  }
}
```

Vapi expects:

```json
{ "results": [{ "toolCallId": "call_abc123", "result": "text the AI reads" }] }
```

### Shared agent lookup

Both routes: parse `assistantId` from `message.call.assistantId`, then load the
agent + customer in one go — `vapi_agents` joined to `customers` — to get
`calendarId, appointmentDurationMinutes, appointmentBufferMinutes, customerId,
vapiAgentId, calendarType, businessHours`, **and `customers.timezone`**.

### `app/api/vapi/tools/check-availability/route.ts` (POST)

1. Verify signature, parse `assistantId`, load agent + customer (above).
2. If `calendarType !== 'google_calendar'` or `calendarId` is null → return:
   "Booking is handled manually. I'll take your details and have someone call you
   back to confirm a time."
3. Parse `preferred_date` (natural language → date range): today / tomorrow / a
   weekday name → next occurrence / "next week" → +7d / unparseable → today.
4. `getAvailableSlots({ ..., timezone })`.
5. If none → "No availability in that window. The next available times are: …" with
   slots from the full 14-day window.
6. Return a result that lists each option with its **`startIso`** so the model can
   pass it back verbatim, e.g.:
   "I have: (1) Thursday July 3, 9:00–11:00 AM [2026-07-03T13:00:00Z]; (2) … .
   When you book, use the bracketed time as slot_start."

### `app/api/vapi/tools/book-appointment/route.ts` (POST)

Tool arguments: `slot_start` (ISO, required), `caller_name`, `caller_phone`,
`issue_summary`, `service_address`.

1. Verify signature, load agent + customer.
2. **Resolve the internal call id.** Use `message.call.id` (the Vapi call id) to look
   up `calls.id`; if no row exists yet, create one via the calls-service helper
   (Task 5a) using the agent mapping + `caller_phone`. This satisfies the NOT NULL
   `bookings.call_id` FK and links the booking so end-of-call reconciliation skips it.
3. Validate `slot_start` is a valid ISO date; `slot_end = slot_start +
   appointmentDurationMinutes`.
4. `bookSlot({ ..., callId })`.
5. On `success: false`:
   - collision → "That time was just taken — let me check again." then call
     `getAvailableSlots` and return fresh options in the same response.
   - calendar error → insert a `status: 'pending'` booking and return: "I've noted
     your preferred time and someone will confirm shortly."
6. On success → "You're booked for [label]. You'll get a confirmation shortly.
   Anything else?"

### Task 5a — calls-service helper

In `lib/services/calls.ts`, add `resolveOrCreateCallId(vapiCallId, fallback:
CreateCallInput): Promise<string>` — selects `calls.id` by `vapiCallId`, inserting
via the existing `createCall` path if absent, and returns the internal UUID. Reuses
the existing create-on-demand pattern already used by `updateCallTranscript`.

### Separation of concerns

- Route handlers: verify → parse Vapi payload → delegate → format Vapi result.
- `calendar-availability.ts`: all calendar + booking logic.
- `calendar-client.ts`: Google API init only.
- Routes never call Google APIs directly.

---

## Task 6: Agent prompt template

Update `lib/templates/agent-prompt.ts`. `PromptConfig` already has `timezone`; add:

```typescript
calendarType: 'google_calendar' | 'manual';
appointmentDurationMinutes: number;
```

Integrate with the EXISTING scheduling instruction (the one that already tells the
agent to anchor relative dates to the current date and confirm them) — do not
duplicate or contradict it.

**When `calendarType === 'google_calendar'`** — add:

```text
BOOKING INSTRUCTIONS (live calendar):
You have two tools: check_availability and book_appointment.
1. Ask the caller's preferred day/time, then call check_availability.
2. Offer up to 3 of the returned slots, read clearly with the date and time.
3. When the caller picks one, call book_appointment and pass slot_start EXACTLY
   as the bracketed ISO value from check_availability — do not reformat or guess it.
4. Read back the confirmed time; tell them they'll get a confirmation.
5. If no slots fit, offer the next available times from the tool response.
6. If booking fails, tell them you've noted their time and someone will call to
   confirm. Never leave the caller without a clear next step.
```

**When `calendarType === 'manual'`** — keep the current message-taking behaviour:

```text
BOOKING INSTRUCTIONS (manual):
Do not attempt to book directly. Collect preferred day, time window, and confirm
the callback number, then tell them: "[OWNER_NAME] will call you back within 2
hours to confirm your appointment."
```

---

## Task 7: Vapi assistant tool configuration (code-driven)

Attach the tools in **both** `createVapiAssistant()` and `updateVapiAssistant()`
in `lib/services/vapi-provisioning.ts`, conditional on `calendarType`. Both functions
must include them so edits and re-syncs never drop them.

Thread the new fields through `ProvisioningConfig`:

```text
calendarType: 'google_calendar' | 'manual'
appointmentDurationMinutes: number
```

…and set them wherever a `ProvisioningConfig` is built:

- `app/api/admin/customers/route.ts` (create)
- `app/api/admin/customers/[id]/route.ts` (edit)
- `app/api/admin/customers/[id]/agent/route.ts` (new agent-config PATCH)
- `scripts/sync-vapi-analysis.ts` (select the new columns, pass them through)

Tool definitions (attached when `calendarType === 'google_calendar'`, else `[]`):

```typescript
const tools = config.calendarType === 'google_calendar' ? [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check available appointment slots. Use when a caller wants to book.",
      parameters: {
        type: "object",
        properties: {
          preferred_date: { type: "string", description: "e.g. 'Thursday', 'tomorrow', 'next week', 'morning'" },
        },
        required: [],
      },
    },
    server: { url: `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi/tools/check-availability` },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Book a confirmed slot. Only after the caller agrees to a specific time.",
      parameters: {
        type: "object",
        properties: {
          slot_start: { type: "string", description: "Chosen slot start, the exact ISO 8601 value from check_availability" },
          caller_name: { type: "string", description: "Caller's full name" },
          caller_phone: { type: "string", description: "Caller's phone number" },
          issue_summary: { type: "string", description: "Brief description of the issue" },
          service_address: { type: "string", description: "Address where work is needed" },
        },
        required: ["slot_start"],
      },
    },
    server: { url: `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi/tools/book-appointment` },
  },
] : [];
```

**Existing assistants (Crayzon, Mazden, etc.):** do NOT edit them in the Vapi
dashboard — a dashboard save previously stripped `structuredDataMultiPlan`. After
setting their `calendar_id`/`calendar_type` in the DB (Task 8), run
`npx tsx scripts/sync-vapi-analysis.ts`; because `updateVapiAssistant()` now attaches
tools, the sync pushes them automatically. (The sync's read-back guard already
verifies the analysis plan; tools ride along on the same update.)

---

## Task 8: Manual steps document

Create `docs/phase-6-manual-steps.md`:

1. Set env vars in Vercel (Production) and `.env.local`:

   ```text
   GOOGLE_SERVICE_ACCOUNT_EMAIL=<from JSON>
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=<from JSON, paste as-is>
   ```

2. For each customer using Google Calendar:
   - Create a dedicated Google Calendar named "[Business Name] — PlumberAnswered".
   - Share it with `GOOGLE_SERVICE_ACCOUNT_EMAIL` → "Make changes to events".
   - Copy the calendar ID (Settings → Integrate calendar → Calendar ID).
   - Set `vapi_agents.calendar_id` and `vapi_agents.calendar_type = 'google_calendar'`
     in Neon for that customer.

3. Push tools to existing assistants **via code, not the dashboard**:

   ```bash
   npx tsx scripts/sync-vapi-analysis.ts
   ```

4. Test end-to-end (web call button on the admin customer detail page):
   - Say "I'd like to book an appointment for Thursday morning".
   - Confirm `check_availability` fires (Vapi dashboard logs).
   - Choose a slot; confirm `book_appointment` fires.
   - Verify the Google Calendar event was created.
   - Verify a `bookings` row in Neon with `status: 'confirmed'` and a `call_id`.
   - Verify the booking appears on the client dashboard.

---

## Environment variables

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
```

`NEXT_PUBLIC_APP_URL` is already set (Phase 3.5) — used in tool server URLs.

---

## Files to create

```text
lib/google/calendar-client.ts
lib/services/calendar-availability.ts
lib/vapi/verify-signature.ts                    ← extracted shared signature check
app/api/vapi/tools/check-availability/route.ts
app/api/vapi/tools/book-appointment/route.ts
app/api/admin/customers/[id]/agent/route.ts     ← agent-config PATCH (uses updateVapiAssistant)
components/ui/dialog.tsx                         ← shadcn Dialog (if not reusing sheet)
docs/phase-6-manual-steps.md
```

## Files to modify

```text
db/schema/enums.ts                              ← bookingStatus, calendarType enums
db/schema/vapi-agents.ts                        ← duration, buffer, calendar_type (calendar_id already exists)
db/schema/bookings.ts                           ← status (calendar_event_id already exists)
lib/templates/agent-prompt.ts                   ← calendarType + duration; integrate w/ existing date instruction
lib/services/vapi-provisioning.ts               ← ProvisioningConfig fields; attach tools in create AND update
lib/services/calls.ts                           ← resolveOrCreateCallId helper
app/api/webhooks/vapi/route.ts                  ← use the extracted verify-signature helper
app/api/admin/customers/route.ts                ← thread calendar fields into ProvisioningConfig + insert
app/api/admin/customers/[id]/route.ts           ← thread calendar fields
components/admin/new-customer-form.tsx          ← duration, buffer, calendar type fields
components/admin/customer-agent-card.tsx        ← display new fields + edit modal
proxy.ts                                         ← add /api/vapi/tools/(.*) to isPublic  (NOT middleware.ts)
scripts/sync-vapi-analysis.ts                   ← select + pass calendar fields so tools sync
```

---

## Coding standards reminder

From `docs/phase-1-foundation.md`:

- One component per file.
- Business logic in `lib/services/`; tool endpoints delegate to
  `calendar-availability.ts`, never call Google APIs directly.
- Route handlers thin: verify → parse → delegate → format → return.
- Short comments only: `// comment`. No decorative banners.
- Wrap all Google Calendar calls in try/catch — never crash a webhook or tool response.
- shadcn `Dialog` (add it) or existing `sheet` for the edit modal — not a custom modal.

---

## Done criteria

- [ ] Schema migration applied via `generate` + `migrate` — new columns exist in Neon
- [ ] Admin form shows duration, buffer, calendar type fields
- [ ] Edit agent config modal saves to DB and patches the assistant via `updateVapiAssistant()`
- [ ] `check_availability` returns real slots (timezone-correct) with machine-readable `startIso`
- [ ] `book_appointment` resolves the internal `call_id`, creates the Calendar event + DB row
- [ ] Targeted free/busy re-check prevents double-bookings under concurrent calls
- [ ] End-of-call `createBookingFromCall` skips the already-created booking (no duplicates)
- [ ] Manual calendar type attempts no tool calls and returns the right message
- [ ] Tools attached in both create AND update; existing assistants get them via the sync script (no dashboard edits)
- [ ] Tool endpoints verify `x-vapi-signature` and are in `proxy.ts` public routes
- [ ] End-to-end test passes (Task 8 step 4) with a real Google Calendar event created
- [ ] Committed: `feat(phase-6): google calendar booking integration`

Report back when done. Confirm the Task 8 end-to-end test passed with a Google
Calendar event actually created before marking complete.
