# Phase 2 — Manual Steps (Frank)

Code is shipped. These steps stand up the live Vapi integration and prep the demo.

## 1. Expose local dev for live Vapi testing

```bash
ngrok http 3000
```

Copy the HTTPS forwarding URL (e.g. `https://abc123.ngrok.io`).

## 2. Point Vapi at the webhook

Vapi dashboard → **Account → Webhooks → Server URL**

- Local testing: `https://<ngrok>.ngrok.io/api/webhooks/vapi`
- Production: `https://<vercel-url>/api/webhooks/vapi` (set after first deploy)

Subscribe to: `call-started`, `transcript`, `call-ended`, `end-of-call-report`.

## 3. Copy the Vapi webhook secret

Vapi dashboard → copy the webhook signing secret. Paste into `.env.local`:

```text
VAPI_WEBHOOK_SECRET=<real value>
```

> While developing locally, `.env.local` also has `SKIP_VAPI_SIGNATURE_VERIFY=true`.
> Do NOT carry that flag to Vercel — production must verify signatures.

## 4. Add the structured-data schema to the assistant

Vapi dashboard → demo assistant → **Analysis Plan** → paste the JSON from
`docs/phase-2-vapi-ingestion.md` (Task 2). Add the `structuredDataPrompt` too.

Save. Without this, `end-of-call-report` arrives with no structured data and
all extraction fields stay null (the row still gets created — just blank).

## 5. Local sanity check via the replay script

Use either `tsx` (recommended — no install needed via npx) or `ts-node`:

```bash
npx tsx scripts/replay-webhook.ts vapi-end-of-call-report
npx tsx scripts/replay-webhook.ts vapi-emergency-call
npx tsx scripts/replay-webhook.ts vapi-dropped-call
```

After each, confirm a row appears in `calls` in Neon. The first fixture should
also produce a row in `bookings` (outcome = booked).

`SKIP_VAPI_SIGNATURE_VERIFY=true` in `.env.local` lets the replay bypass the HMAC
check. Never set this in Vercel.

## 6. Live phone test

Place a real call to the demo number. Within 30 seconds of hanging up, a new
row should appear in `calls` with `ended_at`, `duration_seconds`, `outcome`,
`urgency_level`, and the structured fields populated.

If nothing appears:

- Check Vercel function logs for `[vapi-webhook]` lines
- Vapi dashboard → Webhooks → delivery log (signature failure, 5xx, etc.)
- Confirm the assistant's `assistantId` matches a row in `vapi_agents.vapi_assistant_id`

## 7. Deploy to Vercel + cut over the webhook URL

1. Push the branch, merge to main, let Vercel deploy
2. Vercel project → Environment Variables → Production:
   - `VAPI_WEBHOOK_SECRET=<real value>`
   - Do NOT set `SKIP_VAPI_SIGNATURE_VERIFY`
3. Vapi dashboard → flip Server URL to the production Vercel URL
4. Place one more live call to confirm end-to-end

## 8. Replace assistant ID placeholders

Before running the seed script against production Neon:

- `scripts/seed-demo.ts` → replace `REPLACE_WITH_REAL_VAPI_ASSISTANT_ID` with the
  real Vapi assistant ID
- `docs/fixtures/*.json` (3 files) → replace `REPLACE_WITH_YOUR_VAPI_ASSISTANT_ID`
  with the same real assistant ID

## 9. Seed the demo account

```bash
npx tsx scripts/seed-demo.ts
```

Creates:

- 1 customer (Hightower Plumbing, Ray Hightower, Tampa FL)
- 1 vapi_agent (status active, services + pricing + business hours populated)
- 14 calls spread across the past 14 days (7 booked, 4 message_taken, 2 dropped, 1 transferred)
- 7 bookings spread across the next 14 days

The seed is idempotent — it wipes any prior Hightower data before inserting.

## 10. After the demo: clean up

```bash
npx tsx scripts/cleanup-demo.ts
```

Removes everything tied to `ray@hightowerplumbing.com`. Run this before the first
real paying customer signs up.

---

## Quick reference

| What | Where |
| --- | --- |
| Webhook route | `app/api/webhooks/vapi/route.ts` |
| Call ingestion service | `lib/services/calls.ts` |
| Booking creation | `lib/services/bookings.ts` |
| Agent lookup (cached per-request) | `lib/services/vapi-agents.ts` |
| Public-route exclusion | `proxy.ts` |
| Fixtures | `docs/fixtures/vapi-*.json` |
| Replay script | `scripts/replay-webhook.ts` |
| Seed / cleanup | `scripts/seed-demo.ts`, `scripts/cleanup-demo.ts` |
