# Phase 2: Vapi Webhook Ingestion + Call Data Pipeline

> Instruction file for Claude Code. Read this entire document before making any changes.
> Coding standards from `docs/phase-1-foundation.md` apply to all code in this session.

## Context

Phase 1 is complete. We have:

- 6 tables in Neon with correct schema, FKs, enums, indexes
- Clerk webhook syncing users into our `users` table
- Admin role guard on the `(admin)` route group

Phase 2 goal: when a call comes into the Vapi AI agent, the call data flows automatically into our `calls` and `bookings` tables. By end of this session, calling the demo number should produce a new row in the `calls` table within seconds of the call ending.

## Schema migration first

Before any webhook work, apply two changes to the existing `vapi_agents` table schema.

### Changes to `db/schema/vapi-agents.ts`

**Remove:** `twilio_number` text field

**Add:**

- `phone_number` text (the actual E.164 phone number, e.g. `+14155552671`)
- `phone_number_source` enum — add to `db/schema/enums.ts`:

  ```text
  phoneNumberSource: pgEnum('phone_number_source', ['vapi_native', 'twilio_imported'])
  ```

  Default: `'vapi_native'`

After updating the schema file, run:

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

Verify the new columns exist in Neon before proceeding.

---

## Dev workflow for this session

We are testing against a live Vapi webhook, not mocking at the HTTP level.
Use ngrok for local development:

```bash
ngrok http 3000
```

Copy the HTTPS forwarding URL (e.g. `https://abc123.ngrok.io`).
Set this as the webhook URL in the Vapi dashboard under:
**Vapi Dashboard → Account → Webhooks → Server URL**
Set it to: `https://abc123.ngrok.io/api/webhooks/vapi`

When webhook logic is confirmed working locally, push to Vercel and update the Vapi webhook URL to the production Vercel URL. Do not leave the ngrok URL as the permanent webhook URL.

---

## Task 1: Vapi webhook endpoint

Create `app/api/webhooks/vapi/route.ts`

### Signature verification

Vapi signs webhook payloads using a secret. Verify it on every request.

- Read `VAPI_WEBHOOK_SECRET` from env
- Vapi sends the signature in the `x-vapi-signature` header
- Verification method: HMAC-SHA256 of the raw request body using the secret
- Return 400 if verification fails
- Add `VAPI_WEBHOOK_SECRET=placeholder` to `.env.local`

### Route handler structure

The route handler must stay thin. Pattern:

```text
verify signature → parse body → route to service by event type → return 200
```

Do not put business logic in the route handler.

### Event types to handle

Vapi sends several event types. Handle these four:

**`call-started`**

- Insert a new row into `calls` with:
  - `vapi_call_id`: from `message.call.id`
  - `customer_id`: looked up via `vapi_agent_id` (see lookup logic below)
  - `vapi_agent_id`: looked up by matching `message.call.assistantId` against `vapi_agents.vapi_assistant_id`
  - `caller_phone`: from `message.call.customer.number` (may be null for some calls)
  - `started_at`: from `message.call.startedAt` or `new Date()`
  - `outcome`: leave null (not known yet)
  - All extraction fields (`caller_name`, `issue_summary`, etc.): leave null
- If a row with the same `vapi_call_id` already exists (webhook retry), skip insert and return 200

**`transcript`**

- Vapi sends incremental transcript chunks during the call
- Update the existing `calls` row where `vapi_call_id` matches
- Append the new transcript chunk to `transcript` field
- This event fires multiple times per call — the handler must append, not overwrite
- If no matching row exists (missed `call-started`), insert a partial row

**`end-of-call-report`**

- This is the most important event — fires once when the call ends with full data
- Update the `calls` row where `vapi_call_id` matches:
  - `ended_at`: from `message.call.endedAt`
  - `duration_seconds`: calculate from `startedAt` and `endedAt`
  - `transcript`: overwrite with the final complete transcript from `message.artifact.transcript`
  - `audio_url`: from `message.artifact.recordingUrl` (may be null)
  - `outcome`: mapped from structured data extraction (see Task 2)
  - `urgency_level`: from structured data extraction
  - `caller_name`: from structured data extraction
  - `issue_summary`: from structured data extraction
  - `service_address`: from structured data extraction
- If outcome is `'booked'`, insert a row into `bookings` (see Task 3)

**`call-ended`**

- Fires alongside `end-of-call-report`
- Use only as a fallback to update `ended_at` and `duration_seconds` if `end-of-call-report` hasn't fired
- Check if `ended_at` is already set before updating

### Agent lookup logic

Vapi sends `message.call.assistantId` (the Vapi assistant ID) but not our internal `vapi_agent_id` or `customer_id`. Build a lookup:

```text
lib/services/vapi-agents.ts
→ getAgentByVapiAssistantId(vapiAssistantId: string)
→ returns { id, customerId } from vapi_agents table
→ cache in memory for the duration of the request (no Redis needed yet)
```

If no matching agent is found, log the unknown `assistantId` and return 200 (don't crash — unknown assistant webhooks should be ignored, not errored).

### Separation of concerns

- `app/api/webhooks/vapi/route.ts` — signature verify, parse, route to service
- `lib/services/calls.ts` — `createCall`, `updateCallTranscript`, `finalizeCall`
- `lib/services/bookings.ts` — `createBookingFromCall`
- `lib/services/vapi-agents.ts` — `getAgentByVapiAssistantId`

One file per service. No cross-service imports except where logically necessary.

---

## Task 2: Structured data extraction

Configure the Vapi assistant to extract structured data from every call automatically. This means Vapi's LLM fills in a JSON schema at the end of each call based on the conversation. We receive it in `end-of-call-report` under `message.analysis.structuredData`.

### Vapi assistant configuration

In the Vapi dashboard, on the demo assistant, find the **"Analysis Plan"** section (or `analysisPlan` in the API). Add a structured data schema:

```json
{
  "structuredDataSchema": {
    "type": "object",
    "properties": {
      "caller_name": {
        "type": "string",
        "description": "The full name of the caller, if provided"
      },
      "issue_summary": {
        "type": "string",
        "description": "One sentence describing the plumbing issue the caller described"
      },
      "urgency_level": {
        "type": "string",
        "enum": ["emergency", "urgent", "routine", "unknown"],
        "description": "emergency = active flooding, burst pipe, no water, sewage backup, gas smell. urgent = no hot water, only toilet not flushing, worsening leak. routine = slow drain, dripping faucet, running toilet, quote request. unknown = unclear"
      },
      "service_address": {
        "type": "string",
        "description": "The service address provided by the caller, if any"
      },
      "outcome": {
        "type": "string",
        "enum": ["booked", "message_taken", "transferred", "dropped", "abandoned"],
        "description": "booked = appointment was scheduled. message_taken = caller left a message but no booking. transferred = call was transferred to the owner. dropped = call ended unexpectedly mid-conversation. abandoned = caller hung up before providing details"
      },
      "booking_time": {
        "type": "string",
        "description": "The appointment time agreed upon, in ISO 8601 format if possible, or natural language if not. Only present if outcome is booked."
      }
    },
    "required": ["urgency_level", "outcome"]
  }
}
```

Also add a `structuredDataPrompt`:

```text
Extract the above fields from the conversation. Be conservative with urgency — only mark as emergency if the caller explicitly described active flooding, a burst pipe, no water in the house, sewage backup, or a gas smell. For outcome, use 'dropped' if the call ended mid-sentence or without a clear resolution.
```

### Parsing structured data in the webhook handler

In `lib/services/calls.ts`, parse `message.analysis?.structuredData` in the `finalizeCall` function:

```typescript
// parse with fallbacks — Vapi extraction can return nulls
const structured = message.analysis?.structuredData ?? {}
const outcome = structured.outcome ?? 'message_taken'
const urgencyLevel = structured.urgency_level ?? 'unknown'
const callerName = structured.caller_name ?? null
const issueSummary = structured.issue_summary ?? null
const serviceAddress = structured.service_address ?? null
const bookingTime = structured.booking_time ?? null
```

Always use fallbacks. Structured data extraction occasionally returns null for fields, especially on short or dropped calls.

---

## Task 3: Booking creation

When `outcome === 'booked'`, create a booking row after finalizing the call.

In `lib/services/bookings.ts`:

```text
createBookingFromCall(callId, customerId, bookingTime, notes)
```

- Parse `bookingTime` from structured data — try ISO 8601 parse first, fall back to storing as `notes` if it's natural language ("Tuesday morning", "next Thursday around 10am")
- If `bookingTime` is null, still create the booking row with `scheduled_at` as null and a note: "Booking time not captured — confirm with customer"
- The booking row must always be created when outcome is 'booked', even with incomplete data

---

## Task 4: Idempotency

Vapi retries failed webhooks. Every handler must be idempotent — processing the same event twice must produce the same result as processing it once.

Rules:

- `call-started`: check for existing row by `vapi_call_id` before inserting. Skip if exists.
- `transcript`: append-only. Appending the same chunk twice is acceptable (minor duplication in transcript) — don't try to deduplicate chunks, it's not worth the complexity.
- `end-of-call-report`: use upsert or check-then-update. If `ended_at` is already set, skip the update.
- `bookings`: check for existing booking by `call_id` before inserting. Skip if exists.

---

## Task 5: Test fixtures

Create `docs/fixtures/` folder with sample Vapi webhook payloads for local testing.

### Files to create

**`docs/fixtures/vapi-call-started.json`**

```json
{
  "message": {
    "type": "call-started",
    "call": {
      "id": "vapi_call_fixture_001",
      "assistantId": "REPLACE_WITH_YOUR_VAPI_ASSISTANT_ID",
      "customer": {
        "number": "+18135559182"
      },
      "startedAt": "2026-06-22T14:32:00.000Z"
    }
  }
}
```

**`docs/fixtures/vapi-end-of-call-report.json`**

Use this realistic fake call based on the demo plumbing business (Hightower Plumbing):

```json
{
  "message": {
    "type": "end-of-call-report",
    "call": {
      "id": "vapi_call_fixture_001",
      "assistantId": "REPLACE_WITH_YOUR_VAPI_ASSISTANT_ID",
      "customer": {
        "number": "+18135559182"
      },
      "startedAt": "2026-06-22T14:32:00.000Z",
      "endedAt": "2026-06-22T14:35:47.000Z"
    },
    "artifact": {
      "transcript": "AI: Hightower Plumbing, this is Sarah, how can I help you?\nCaller: Hi yeah, I've got water coming out from under my kitchen sink, it's been dripping for a couple days now.\nAI: I'm sorry to hear that. Can I get your name?\nCaller: It's Marcus Webb.\nAI: Thanks Marcus. And your service address?\nCaller: 4821 Cypress Run Drive, Tampa.\nAI: Got it. Would you say the leak is getting worse or staying about the same?\nCaller: Staying about the same I'd say. It's been two days and it's still just dripping.\nAI: Okay, that sounds like a routine repair we can get to within a few days. Our standard service call is $89 and the technician will quote the full job on site. What time window works best for you?\nCaller: Uh, Thursday morning if possible?\nAI: Thursday morning works. I've got you down for Thursday between 8 and 11am. You'll get a confirmation shortly. Anything else I can help with?\nCaller: No that's great, thanks.\nAI: Perfect, see you Thursday Marcus. Have a good one.",
      "recordingUrl": null
    },
    "analysis": {
      "structuredData": {
        "caller_name": "Marcus Webb",
        "issue_summary": "Water dripping from under the kitchen sink for two days, not getting worse.",
        "urgency_level": "routine",
        "service_address": "4821 Cypress Run Drive, Tampa",
        "outcome": "booked",
        "booking_time": "2026-06-25T08:00:00.000Z"
      }
    }
  }
}
```

**`docs/fixtures/vapi-emergency-call.json`**

```json
{
  "message": {
    "type": "end-of-call-report",
    "call": {
      "id": "vapi_call_fixture_002",
      "assistantId": "REPLACE_WITH_YOUR_VAPI_ASSISTANT_ID",
      "customer": {
        "number": "+18135554401"
      },
      "startedAt": "2026-06-22T02:14:00.000Z",
      "endedAt": "2026-06-22T02:17:22.000Z"
    },
    "artifact": {
      "transcript": "AI: Hightower Plumbing, this is Sarah, how can I help you?\nCaller: Yeah my basement is flooding right now, like there's water coming in fast I don't know what to do.\nAI: Okay, this is an emergency. First — do you know where your main water shutoff valve is?\nCaller: Uh, I think it's near the water heater?\nAI: Go shut that off right now if you can, it'll stop more water coming in. I'm getting someone out to you as soon as possible. What's your name and address?\nCaller: Dave Kowalski, 902 Palmetto Boulevard, Tampa.\nAI: Got it Dave. I'm flagging this as an emergency right now. Someone will call you back within 15 minutes. Is your phone number the one you're calling from?\nCaller: Yeah that's my cell.\nAI: Perfect. Go shut off that valve and stay on the safe side of the water. You'll hear back very shortly.\nCaller: Okay thank you.",
      "recordingUrl": null
    },
    "analysis": {
      "structuredData": {
        "caller_name": "Dave Kowalski",
        "issue_summary": "Basement actively flooding, caller reporting fast water intrusion.",
        "urgency_level": "emergency",
        "service_address": "902 Palmetto Boulevard, Tampa",
        "outcome": "message_taken",
        "booking_time": null
      }
    }
  }
}
```

**`docs/fixtures/vapi-dropped-call.json`**

```json
{
  "message": {
    "type": "end-of-call-report",
    "call": {
      "id": "vapi_call_fixture_003",
      "assistantId": "REPLACE_WITH_YOUR_VAPI_ASSISTANT_ID",
      "customer": {
        "number": "+18135557723"
      },
      "startedAt": "2026-06-22T09:45:00.000Z",
      "endedAt": "2026-06-22T09:45:18.000Z"
    },
    "artifact": {
      "transcript": "AI: Hightower Plumbing, this is Sarah, how can I help you?\nCaller: Hi I wanted to ask about—",
      "recordingUrl": null
    },
    "analysis": {
      "structuredData": {
        "caller_name": null,
        "issue_summary": null,
        "urgency_level": "unknown",
        "service_address": null,
        "outcome": "dropped",
        "booking_time": null
      }
    }
  }
}
```

### Replay script

Create `scripts/replay-webhook.ts`:

```typescript
// sends a fixture payload to the local webhook endpoint for testing
// usage: npx ts-node scripts/replay-webhook.ts <fixture-name>
// example: npx ts-node scripts/replay-webhook.ts vapi-end-of-call-report
```

The script should:

- Accept a fixture name as CLI arg
- Read the corresponding JSON file from `docs/fixtures/`
- POST it to `http://localhost:3000/api/webhooks/vapi`
- Skip signature verification in development (add `SKIP_VAPI_SIGNATURE_VERIFY=true` env var that bypasses the HMAC check when running locally)
- Log the response status and body

This means you can test ingestion logic without ngrok by running the replay script directly.

---

## Task 6: Seed data for demo

Create `scripts/seed-demo.ts`

This script creates a complete fake customer account in the DB for demo purposes. Run it once against production Neon before Thursday's demo.

### The fake business

Use this data consistently across all seed data:

```text
Business name:    Hightower Plumbing
Owner name:       Ray Hightower
Email:            ray@hightowerplumbing.com
Phone:            +18135550192
City:             Tampa
State:            FL
Timezone:         America/New_York
Service area:     Hillsborough County
Plan:             pilot
Status:           active
Subscription:     active
```

### What the script creates

1. One `customers` row with the above data
2. One `vapi_agents` row:

   ```text
   vapi_assistant_id:   REPLACE_WITH_REAL_VAPI_ASSISTANT_ID
   phone_number:        +18135550192
   phone_number_source: vapi_native
   status:              active
   owner_name:          Ray Hightower
   emergency_definition: Active flooding, burst pipe, no water in house, sewage backup, gas smell
   business_hours:      {"mon":{"open":"07:00","close":"17:00"},"tue":{"open":"07:00","close":"17:00"},"wed":{"open":"07:00","close":"17:00"},"thu":{"open":"07:00","close":"17:00"},"fri":{"open":"07:00","close":"17:00"},"sat":{"open":"08:00","close":"13:00"},"sun":null}
   services_offered:    [{"name":"Leak repair","ballpark":"$150-$350"},{"name":"Drain cleaning","ballpark":"$99-$199"},{"name":"Water heater replacement","ballpark":"$800-$1,400"},{"name":"Toilet repair","ballpark":"$120-$250"},{"name":"Faucet repair or replacement","ballpark":"$85-$200"},{"name":"Pipe repair","ballpark":"$200-$600"},{"name":"Emergency call-out","ballpark":"$150 after-hours surcharge"}]
   pricing_table:       {"service_call_fee":"$89","hourly_rate":"$110","after_hours_surcharge":"$150","free_estimates":false}
   ```text

3. Fourteen `calls` rows spread across the past 14 days:

   - Mix of outcomes: 7 booked, 4 message_taken, 2 dropped, 1 transferred
   - Mix of urgency: 1 emergency, 3 urgent, 8 routine, 2 unknown
   - Realistic caller names, Tampa-area addresses, genuine-sounding issue summaries
   - Timestamps spread across different times of day (morning rush, lunch, afternoon)
   - Duration between 45 seconds (dropped) and 4 minutes (complex booking)
4. Seven `bookings` rows corresponding to the 7 booked calls, spread across the next 14 days

### Caller data to use for the 14 calls

Use these to make it look real:

```text
1.  Marcus Webb        +18135559182   4821 Cypress Run Dr, Tampa      kitchen sink leak          routine    booked
2.  Dave Kowalski      +18135554401   902 Palmetto Blvd, Tampa         basement flooding          emergency  message_taken
3.  Linda Torres       +18135552209   1103 Bayside Ave, Tampa          slow shower drain          routine    booked
4.  James Okafor       +18135558834   307 Lemon St, Tampa              no hot water               urgent     booked
5.  Patricia Nguyen    +18135553317   88 Harbour Island Blvd, Tampa    dripping faucet            routine    booked
6.  Unknown caller     +18135557723   null                             unknown (dropped)          unknown    dropped
7.  Steve Marinelli    +18135556621   2240 Bayshore Blvd, Tampa        running toilet             routine    booked
8.  Carol Hutchins     +18135551198   540 W Kennedy Blvd, Tampa        water heater quote         routine    message_taken
9.  Tony Reyes         +18135555509   19 Davis Islands Blvd, Tampa     only toilet not flushing   urgent     booked
10. Unknown caller     +18135559947   null                             unknown (dropped)          unknown    dropped
11. Margaret Chen      +18135553382   4402 Henderson Blvd, Tampa       pipe under house leaking   urgent     message_taken
12. Robert Ellis       +18135557741   6601 N Nebraska Ave, Tampa       wants quote new water htr  routine    booked
13. Dawn Petersen      +18135554423   211 S Dale Mabry, Tampa          sewer smell in basement    urgent     transferred
14. Frank Castillo     +18135558856   3301 Swann Ave, Tampa            kitchen faucet replacement routine    message_taken
```

### Cleanup script

Also create `scripts/cleanup-demo.ts` that deletes all rows created by `seed-demo.ts` (by customer email `ray@hightowerplumbing.com`). Run this after Thursday's demo before the first real customer goes live.

---

## Middleware exclusion

Add `/api/webhooks/vapi` to the public routes in `middleware.ts` (same pattern as the Clerk webhook). Vapi calls come from Vapi's servers, not authenticated users.

---

## Environment variables

Add to `.env.local`:

```text
VAPI_WEBHOOK_SECRET=placeholder_set_in_vapi_dashboard
SKIP_VAPI_SIGNATURE_VERIFY=true
```

Add to Vercel environment variables (Production):

```text
VAPI_WEBHOOK_SECRET=<real value from Vapi dashboard>
```

Do not set `SKIP_VAPI_SIGNATURE_VERIFY` in Vercel — only local.

---

## Manual steps after code is done

Create `docs/phase-2-manual-steps.md` with:

1. Vapi dashboard → Account → Webhooks → Server URL → set to ngrok URL for local testing
2. Copy Vapi webhook secret → paste into `.env.local` as `VAPI_WEBHOOK_SECRET`
3. On the Vapi assistant → Analysis Plan → paste the structured data schema from Task 2
4. Run `npx ts-node scripts/replay-webhook.ts vapi-end-of-call-report` — confirm a `calls` row appears in Neon
5. Run `npx ts-node scripts/replay-webhook.ts vapi-emergency-call` — confirm a second row appears
6. Run `npx ts-node scripts/replay-webhook.ts vapi-dropped-call` — confirm dropped call row appears
7. Call the demo number live — confirm a new row appears in Neon within 30 seconds of call ending
8. Push to Vercel, update Vapi webhook URL to production Vercel URL
9. Update `REPLACE_WITH_YOUR_VAPI_ASSISTANT_ID` placeholders in all fixture files with the real assistant ID
10. Update `REPLACE_WITH_REAL_VAPI_ASSISTANT_ID` in `scripts/seed-demo.ts` with the real assistant ID
11. Run `npx ts-node scripts/seed-demo.ts` against production Neon

---

## Coding standards reminder

All standards from `docs/phase-1-foundation.md` apply. Key ones for this session:

- One service function per concern — `createCall`, `updateCallTranscript`, `finalizeCall` are separate functions, not one big handler
- Route handler stays thin — verify → parse → delegate → return
- Short-form comments only: `// comment`
- No decorative banners or block comments
- All DB calls wrapped in try/catch with explicit error logging
- Idempotency on every write operation

---

## Done criteria

Phase 2 is complete when:

1. Schema migration applied — `phone_number` and `phone_number_source` columns exist in `vapi_agents`
2. Webhook endpoint at `/api/webhooks/vapi` handles all 4 event types
3. Replay script works — running all 3 fixtures produces correct rows in `calls` and `bookings`
4. Live call test works — calling the demo number produces a `calls` row in Neon within 30 seconds of call ending
5. Seed script creates all 14 calls + 7 bookings for Hightower Plumbing
6. `docs/phase-2-manual-steps.md` created
7. Committed: `feat(phase-2): vapi ingestion, call pipeline, seed data`

Report back when done. Flag anything that deviated from this brief and why.
