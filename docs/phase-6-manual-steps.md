# Phase 6 — Manual steps

Code for Google Calendar booking is implemented. These steps wire up the
service account, connect each customer's calendar, and push the tools to
existing assistants. Do these in order.

## 1. Google Cloud service account

1. In Google Cloud Console, create (or reuse) a project.
2. Enable the **Google Calendar API**.
3. Create a **service account**; create a **JSON key** for it.
4. Note the service account email — it looks like
   `something@your-project.iam.gserviceaccount.com`.

## 2. Environment variables

Add to `.env.local` (dev) and Vercel → Project → Settings → Environment
Variables (Production):

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL=something@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Paste the private key exactly as it appears in the JSON (with the literal `\n`
sequences) — the code converts them to real newlines.

`NEXT_PUBLIC_APP_URL`, `VAPI_WEBHOOK_SECRET`, and `VAPI_API_KEY` are already set
from earlier phases and are reused by the tool endpoints.

## 3. Connect each customer's calendar

For every customer that should book via Google Calendar:

1. In Google Calendar (web), create a dedicated calendar named
   `"[Business Name] — PlumberAnswered"`.
2. Calendar **Settings → Share with specific people** → add
   `GOOGLE_SERVICE_ACCOUNT_EMAIL` with **"Make changes to events"**.
3. Copy the calendar's ID: **Settings → Integrate calendar → Calendar ID**
   (looks like `...@group.calendar.google.com`).
4. In the admin app, open the customer → **AI agent** card → **Edit agent
   config** → set Calendar integration to **Google Calendar**, paste the
   **Calendar ID**, set duration/buffer, and Save. (This also re-syncs the
   assistant.)

New customers created through the admin form can set all of this at creation
time in the **Booking & calendar** section.

## 4. Push tools to existing assistants (code, NOT the dashboard)

Existing assistants (Crayzon, Mazden, etc.) need the two function tools. Do NOT
add them in the Vapi dashboard — a dashboard save previously stripped the
structured-data plan. Instead, once their `calendar_type`/`calendar_id` are set
(step 3), run:

```bash
npx tsx scripts/sync-vapi-analysis.ts
```

`updateVapiAssistant()` attaches the tools, so the sync pushes them and verifies
the analysis plan in one pass.

## 5. End-to-end test

1. Open a customer's detail page in the admin app and use the **web call** button.
2. Say: "I'd like to book an appointment for Thursday morning."
3. Confirm `check_availability` fires (Vapi dashboard → call logs → tool calls).
4. Choose one of the offered times.
5. Confirm `book_appointment` fires.
6. Verify a new event appears on the customer's Google Calendar.
7. Verify a `bookings` row in Neon with `status = 'confirmed'`, a non-null
   `call_id`, and the `calendar_event_id` set.
8. Verify the booking shows on the client dashboard.

## Notes

- Manual calendar type (`calendar_type = 'manual'`) attaches no tools; the agent
  collects details and promises a callback instead.
- Slot policy: appointment duration + buffer are per-customer; minimum lead time
  (2h) and booking window (14 days) are global constants in
  `lib/services/calendar-availability.ts`.
- If the calendar is unreachable mid-call, the agent falls back to taking a
  message and a `pending` booking is recorded so the time isn't lost.
