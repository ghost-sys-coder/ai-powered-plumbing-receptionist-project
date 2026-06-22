# Phase 3: Client Dashboard + Admin Dashboard

> Instruction file for Claude Code. Read this entire document before making any changes.
> Coding standards from `docs/phase-1-foundation.md` apply to all code in this session.
> Phase 2 must be complete before starting this phase — calls must be flowing into the DB.

## Context

This phase builds both dashboards before Thursday's prospect demo. The prospect will be shown the client dashboard on a screen share. The admin dashboard is built this week because it contains the customer provisioning form needed to set up his account properly before the demo.

**Demo-critical (must be perfect by Thursday):**

- Client dashboard — all 4 screens
- Seed data looking real and plumbing-specific

**Operationally critical (must work by Thursday, not perfect):**

- Admin dashboard — customer list, customer detail, provisioning form with Vapi API

**Not in scope this phase:**

- Stripe billing
- Self-serve customer signup
- Email notifications
- Analytics charts
- Editable agent settings for client users
- Vapi automation for after-hours agents

---

## Design direction

This is a B2B ops dashboard for solo US plumbing business owners. The client is not a tech user. The design should feel:

- **Clean and immediately readable** — a plumber logs in between jobs on his phone or truck laptop. He needs to see what happened at a glance.
- **Professional without being corporate** — shadcn defaults are fine as a base but add a consistent accent color and clear visual hierarchy. Use `slate` for neutrals, a strong blue (`#1D4ED8`) as the primary accent. Not generic gray-on-white.
- **Data-forward** — calls are the product. The calls list should be the most prominent element on every screen it appears on.
- **Status-driven** — outcome and urgency badges are the most important scannable elements. Make them visually distinct: emergency = red, urgent = amber, routine = green, unknown = slate. Booked = blue, message_taken = slate, transferred = purple, dropped = red/muted, abandoned = slate/muted.

Use shadcn `Card`, `Table`, `Badge`, `Button`, `Separator`, `Skeleton` (for loading states). No custom components that duplicate these.

Use custom CSS animations (defined in `globals.css`) for:

- Page load fade-in on dashboard cards
- Badge pulse on emergency urgency calls (subtle, not distracting)
- Skeleton shimmer on loading states

---

## Shared components

Create these before building any screens. They are used across both dashboards.

### `components/calls/outcome-badge.tsx`

Renders a shadcn `Badge` with the correct variant and label for a call outcome.

- `booked` → blue, "Booked"
- `message_taken` → slate, "Message"
- `transferred` → purple, "Transferred"
- `dropped` → red/muted, "Dropped"
- `abandoned` → slate/muted, "Abandoned"

### `components/calls/urgency-badge.tsx`

Renders a shadcn `Badge` for urgency level.

- `emergency` → destructive red, "Emergency" — add subtle pulse animation via CSS
- `urgent` → amber, "Urgent"
- `routine` → green, "Routine"
- `unknown` → slate, "Unknown"

### `components/calls/call-duration.tsx`

Formats `duration_seconds` into human-readable string.

- Under 60s: "45s"
- 60s+: "3m 22s"
- Null: "—"

### `components/layout/page-header.tsx`

Consistent page header used across all screens.
Props: `title`, `description` (optional), `action` (optional — renders a button slot on the right)

### `components/layout/stat-card.tsx`

A shadcn `Card` displaying a single metric.
Props: `label`, `value`, `subtext` (optional), `trend` (optional — shows a small up/down indicator)
Used on overview screens.

---

## Part A: Client Dashboard

Route group: `app/(dashboard)/`

The logged-in user is a plumber (or their assistant). They see only their own data — scoped by `customer_id` via the `users` table.

### Data scoping helper

Create `lib/auth/get-customer-id.ts`:

```typescript
// gets the customer_id for the currently logged-in client user
// redirects to /sign-in if not authenticated
// throws if user has no associated customer (misconfigured account)
```

Use this at the top of every client dashboard page. Never query calls/agents without scoping to `customer_id`.

---

### Screen A1: Overview — `app/(dashboard)/dashboard/page.tsx`

**Purpose:** At-a-glance summary of recent activity. First thing the plumber sees on login.

**Layout:**

- Page header: "Good morning, Ray." (use owner_name from their VapiAgent config, fall back to their Clerk first name)
- Four stat cards in a responsive grid (2×2 on mobile, 4×1 on desktop):
  1. **Calls today** — count of calls where `started_at` is today
  2. **Calls this week** — count where `started_at` >= Monday of current week
  3. **Booked this week** — count where outcome = 'booked' and this week
  4. **Missed this week** — count where outcome in ('dropped', 'abandoned') and this week
- Recent calls section below the cards:
  - Heading: "Recent calls"
  - Last 5 calls in a condensed list (not full table) — show caller name or phone, outcome badge, urgency badge, time ago ("2 hours ago")
  - "View all calls →" link to `/dashboard/calls`
- Empty state: if no calls yet, show a card with "No calls yet — your AI agent is ready and waiting. Call your demo number to test it." Do not show an empty table.

**Data fetching:** server component, fetch on the server. No client-side data fetching on this screen.

---

### Screen A2: Calls list — `app/(dashboard)/dashboard/calls/page.tsx`

**Purpose:** Full history of all calls, scannable and filterable.

**Layout:**

- Page header: "Calls" with a subtle call count in the description ("247 total")
- Filter bar (client component, keep separate from the page):
  - Outcome filter: All / Booked / Message / Dropped (shadcn `Select` or tab-style toggle)
  - Urgency filter: All / Emergency / Urgent / Routine
  - Date range: This week / Last 7 days / Last 30 days / All time (shadcn `Select`)
- Calls table (shadcn `Table`):
  - Columns: Time, Caller, Issue, Urgency, Outcome, Duration
  - Time: formatted as "Mon Jun 22, 2:32pm" — full date + time, not "2 hours ago" (this is a log, not a feed)
  - Caller: show `caller_name` if available, fall back to formatted phone number, fall back to "Unknown"
  - Issue: `issue_summary` truncated to 60 chars with ellipsis
  - Urgency: `urgency-badge` component
  - Outcome: `outcome-badge` component
  - Duration: `call-duration` component
  - Each row is clickable → navigates to `/dashboard/calls/[id]`
- Pagination: 20 calls per page, shadcn pagination component
- Empty state per filter: "No emergency calls this week." etc.

**Component split:**

- `app/(dashboard)/dashboard/calls/page.tsx` — server component, fetches paginated data
- `components/calls/calls-table.tsx` — renders the table
- `components/calls/calls-filter-bar.tsx` — client component, handles filter state
- `components/calls/calls-table-row.tsx` — single row, handles click navigation

---

### Screen A3: Call detail — `app/(dashboard)/dashboard/calls/[id]/page.tsx`

**Purpose:** Full detail of a single call. This is the "wow" screen for the demo — the prospect reads a real transcript of his AI handling a call.

**Layout:**

- Back link: "← All calls"
- Page header: caller name + phone, timestamp, duration
- Two-column layout on desktop, stacked on mobile:
  - **Left column (wider):**
    - Transcript card — full transcript in a scrollable container, formatted as a conversation (AI lines vs Caller lines visually distinct — use different text colors or subtle background per speaker)
    - Audio player if `audio_url` is present (native HTML5 `<audio>` element with controls, styled to match — no library needed)
    - If no audio: "Recording not available for this call"
  - **Right column:**
    - Call summary card:
      - Outcome badge (large)
      - Urgency badge (large)
      - Caller: name + phone
      - Issue: full `issue_summary`
      - Address: `service_address` or "Not provided"
      - Duration: formatted
      - Time: full date and time
    - Booking card (only if outcome = 'booked'):
      - "Appointment booked" heading
      - Scheduled time
      - Calendar event ID if present
      - Notes if present

**Transcript formatting:**
Parse the transcript string into lines. Lines starting with "AI:" get one style, "Caller:" gets another. Wrap each in a `<div>` with appropriate styling. Use a monospace or slightly condensed font for the transcript body.

**Component split:**

- `app/(dashboard)/dashboard/calls/[id]/page.tsx` — server component, fetches call + booking
- `components/calls/call-transcript.tsx` — renders formatted transcript
- `components/calls/call-summary-card.tsx` — right column summary
- `components/calls/call-booking-card.tsx` — booking info, only renders if booked
- `components/calls/call-audio-player.tsx` — audio element with styling

---

### Screen A4: Agent settings — `app/(dashboard)/dashboard/agent/page.tsx`

**Purpose:** Shows the plumber what his AI agent is configured with. Read-only — they contact you to make changes.

**Layout:**

- Page header: "Your AI Agent" with description "Managed by PlumbVoice — contact us to make changes"
- Agent status card: shows `status` with a colored dot (green = active, yellow = paused, red = error) and the phone number the agent answers on
- Business hours card: renders the `business_hours` JSON as a readable weekly schedule table (Mon–Sun, open/closed times, or "Closed" for null days)
- Services card: renders `services_offered` JSON as a list — service name + ballpark price
- Pricing card: renders `pricing_table` — service call fee, hourly rate, after-hours surcharge
- Emergency definition card: plain text, "Calls we treat as emergencies:"
- "Need to update your settings?" card at the bottom:
  - Text: "Contact your PlumbVoice manager to update your agent configuration. Changes are applied within 24 hours."
  - A mailto link or a simple copy-to-clipboard button for your email address — use env var `NEXT_PUBLIC_SUPPORT_EMAIL`

**Component split:**

- `app/(dashboard)/dashboard/agent/page.tsx` — server component, fetches `vapi_agents` row by `customer_id`
- `components/agent/agent-status-card.tsx`
- `components/agent/business-hours-card.tsx`
- `components/agent/services-card.tsx`
- `components/agent/pricing-card.tsx`

---

## Part B: Admin Dashboard

Route group: `app/(admin)/`

All admin screens are already guarded by the role check from Phase 1. Only you (admin role) can access these.

---

### Screen B1: Customer list — `app/(admin)/admin/page.tsx`

**Purpose:** See all customers at a glance. Starting point for managing any account.

**Layout:**

- Page header: "Customers" with "Add customer" button on the right → links to `/admin/customers/new`
- Summary stats row: Total customers, Active, Onboarding, Churned (four small stat cards)
- Customers table:
  - Columns: Business, Owner, Status, Plan, Subscription, Calls (last 7d), Since
  - Status: colored badge (onboarding = amber, active = green, paused = slate, churned = red)
  - Plan: "Pilot" or "Standard"
  - Subscription: subscription_status badge
  - Calls last 7d: count of calls in the last 7 days (join to calls table)
  - Since: `created_at` formatted as "Jun 2026"
  - Each row clickable → `/admin/customers/[id]`
- Empty state: "No customers yet. Add your first customer to get started."

**Component split:**

- `app/(admin)/admin/page.tsx` — server component
- `components/admin/customers-table.tsx`
- `components/admin/customers-table-row.tsx`

---

### Screen B2: Customer detail — `app/(admin)/admin/customers/[id]/page.tsx`

**Purpose:** Full view of one customer's account. Where you manage their config and monitor their agent.

**Layout:**

- Back link: "← All customers"
- Page header: business name + status badge. Action buttons: "Edit config" (future), "Pause agent", "View as client" (future)
- Four-section layout:
  1. **Account info card:** owner name, email, phone, address, timezone, plan, subscription status, stripe customer ID, dates (created, onboarded, churned if applicable)
  2. **Agent status card:** vapi_assistant_id, phone number, status, last call timestamp
  3. **Recent calls card:** last 10 calls in condensed list with outcome + urgency badges. Link: "View all calls →" (filtered to this customer)
  4. **Upcoming bookings card:** next 5 bookings sorted by scheduled_at ascending

**Component split:**

- `app/(admin)/admin/customers/[id]/page.tsx` — server component
- `components/admin/customer-account-card.tsx`
- `components/admin/customer-agent-card.tsx`
- `components/admin/customer-recent-calls.tsx`
- `components/admin/customer-bookings.tsx`

---

### Screen B3: New customer form — `app/(admin)/admin/customers/new/page.tsx`

**Purpose:** Provision a new plumbing business in one form. Creates DB rows AND provisions the Vapi assistant automatically.

This is the most complex screen. Read this section fully before writing any code.

**The provisioning flow:**

When the form is submitted, the following must happen in order:

1. Validate all required fields
2. Create `customers` row in DB (status: 'onboarding')
3. Call Vapi API to create the assistant
4. Call Vapi API to provision a phone number
5. Link the phone number to the assistant (Vapi API call)
6. Create `vapi_agents` row with the returned IDs (status: 'active')
7. Update `customers` row status to 'active', set `onboarded_at`
8. Redirect to `/admin/customers/[new-id]`

If step 3, 4, or 5 fails, the customers row status stays 'onboarding' and an error is shown. Do not delete the customers row on failure — allow retry. The `vapi_agents` row is only created if all Vapi API calls succeed.

**Vapi API calls:**

Install the Vapi SDK if not already installed:

```bash
npm install @vapi-ai/server-sdk
```

Create `lib/services/vapi-provisioning.ts` with three functions:

```typescript
// creates a Vapi assistant with the given config
// returns { vapiAssistantId }
createVapiAssistant(config: ProvisioningConfig)

// provisions a US phone number from Vapi's pool
// returns { vapiPhoneNumberId, phoneNumber }
provisionVapiPhoneNumber()

// links the assistant to the phone number
// returns void
linkPhoneNumberToAssistant(vapiPhoneNumberId: string, vapiAssistantId: string)
```

The assistant creation config must use a system prompt template. Create `lib/templates/agent-prompt.ts` that takes the customer config and returns the full system prompt string — interpolating business name, service area, owner name, services list, pricing, and emergency definition into the prompt. Use the Vapi agent system prompt from the operations guide as the base template.

**Form fields:**

Section 1 — Business info:

- Business name (required)
- Owner name (required)
- Email (required)
- Phone
- Address, City, State
- Timezone (select, US timezones only, default America/New_York)
- Service area

Section 2 — Agent config:

- Emergency definition (textarea, required)
- Business hours (one row per day Mon–Sun, each with open time + close time + "Closed" toggle)
- Services offered (dynamic list — add/remove rows, each row: service name + ballpark price)
- Pricing table (four fields: service call fee, hourly rate, after-hours surcharge, free estimates toggle)

Section 3 — Billing (optional for now, fill later):

- Plan: Pilot / Standard (select, default Standard)
- Stripe customer ID (optional text field)

Submit button: "Create customer & provision agent"

During submission, show a multi-step progress indicator:

1. "Creating account..." (DB)
2. "Provisioning AI assistant..." (Vapi assistant creation)
3. "Assigning phone number..." (Vapi number)
4. "Activating agent..." (linking + DB update)
5. "Done ✓" (redirect)

Use CSS animation for the step transitions — no JS animation library.

**Component split:**

- `app/(admin)/admin/customers/new/page.tsx` — thin page wrapper
- `components/admin/new-customer-form.tsx` — main client component (form state lives here)
- `components/admin/business-hours-input.tsx` — the weekly hours grid (client component)
- `components/admin/services-input.tsx` — dynamic services list (client component)
- `components/admin/provisioning-progress.tsx` — step progress during submission
- `lib/services/vapi-provisioning.ts` — all Vapi API calls
- `lib/templates/agent-prompt.ts` — system prompt builder
- `app/api/admin/customers/route.ts` — POST handler that runs the provisioning flow server-side

**Important:** the Vapi API calls must run server-side (in the route handler or a server action), not from the client. The Vapi API key must never be exposed to the browser.

**Environment variables:**

```text
VAPI_API_KEY=your_vapi_api_key
```

Add to `.env.local` and to Vercel environment variables.

---

## Navigation

### Client dashboard nav — `components/layout/client-nav.tsx`

Sidebar or top nav for the `(dashboard)` route group. Links:

- Overview (`/dashboard`)
- Calls (`/dashboard/calls`)
- Agent (`/dashboard/agent`)

Show the business name (from their VapiAgent config) in the nav header. Show Clerk's `UserButton` for account/sign-out.

### Admin nav — `components/layout/admin-nav.tsx`

Sidebar for the `(admin)` route group. Links:

- Customers (`/admin`)

Show "PlumbVoice Admin" in the nav header. Show Clerk's `UserButton`.

---

## Loading and error states

Every page needs:

**Loading state:** use Next.js `loading.tsx` files alongside each page. Show `Skeleton` components (shadcn) that match the layout of the actual content. Do not show spinners alone.

**Error state:** use Next.js `error.tsx` files. Show a clean error card with the message and a "Try again" button. Do not expose raw error messages to the client.

**Empty states:** every list or table needs an empty state. Write them as if the user is reading instructions, not seeing a failure:

- Calls list empty: "No calls yet. Your agent is live and ready — calls will appear here as they come in."
- Customers list empty: "No customers yet. Add your first customer to get started."

---

## CSS animations (define in globals.css)

```css
/* fade in on page load */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

/* emergency badge pulse */
@keyframes emergencyPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.animate-emergency-pulse {
  animation: emergencyPulse 1.5s ease-in-out infinite;
}

/* skeleton shimmer */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to { background-position: 200% 0; }
}

.animate-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* provisioning step transition */
@keyframes stepComplete {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-step-complete {
  animation: stepComplete 0.2s ease-out forwards;
}
```

Apply `animate-fade-in` to the main content wrapper on each page. Apply `animate-emergency-pulse` to the urgency badge when level is 'emergency'. Use `animate-shimmer` inside loading skeletons.

---

## Coding standards reminder

From `docs/phase-1-foundation.md` — strictly enforced:

- One React component per file — no exceptions
- Business logic in `lib/services/` not in components
- Route handlers thin: verify → parse → delegate → return
- Short-form comments only: `// comment`
- No decorative banners or block comments
- Use shadcn primitives — do not recreate Button, Card, Badge, Table, Select, Input
- Custom CSS animations in `globals.css` — no framer-motion or similar
- Imports grouped: external → internal → types

---

## Done criteria

Phase 3 is complete when:

**Client dashboard:**

- [ ] Overview screen shows real stats from seeded Hightower Plumbing data
- [ ] Calls list shows all 14 seeded calls with correct badges, is paginated, filters work
- [ ] Call detail shows transcript formatted correctly, summary card, booking card for booked calls
- [ ] Agent settings shows Hightower Plumbing's config in readable format

**Admin dashboard:**

- [ ] Customer list shows Hightower Plumbing row with correct stats
- [ ] Customer detail shows full account + agent info + recent calls + bookings
- [ ] New customer form submits, runs provisioning flow, shows progress steps, redirects on success
- [ ] Vapi assistant is actually created in Vapi dashboard after form submission (verify manually)

**Polish:**

- [ ] All loading states use Skeleton components
- [ ] All empty states have instructional copy
- [ ] CSS animations applied (fade-in, emergency pulse, shimmer)
- [ ] Mobile layout checked — no horizontal scroll, readable on small screen

**Demo readiness:**

- [ ] Sign in as a client user linked to Hightower Plumbing → lands on overview, sees real data
- [ ] Walk through all 4 client screens without errors
- [ ] Sign in as admin → see customers list → click Hightower → see full detail

Committed: `feat(phase-3): client dashboard, admin dashboard, provisioning`

Report back when done. Flag anything that deviated from this brief and explain why. Surface any screens that don't look right before Thursday — we fix them before the demo, not after.
