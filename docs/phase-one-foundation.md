# Phase 1: Foundation — Database Schema, Clerk Sync, Admin Role Guard

> Instruction file for Claude Code. Read this entire document before making any changes. Follow the coding standards in the section at the bottom strictly.

## Context

This is a Next.js 15 App Router project using:

- Clerk for authentication (already integrated, route protection working)
- Drizzle ORM with Neon (PostgreSQL) — currently with an example schema that needs to be replaced
- Route groups: `(auth)`, `(admin)`, `(dashboard)` — all logged-in users currently default to client behavior
- Tailwind + shadcn/ui for components

This is for **PlumbVoice**, an AI call answering service for solo US plumbing businesses. We are building the database foundation that all future features will depend on.

## Goals for this session

1. Replace example Drizzle schema with the real production schema (6 tables)
2. Set up Clerk webhook to sync users into our DB on signup
3. Add admin role guard so non-admin users can't access `(admin)` routes
4. Run migrations against Neon
5. Document the manual Clerk dashboard steps that need to happen after code is done

---

## Task 1: Drizzle Schema

Replace the current example schema with the production schema below.

### Conventions

- UUID v4 primary keys generated via `gen_random_uuid()` (Postgres native)
- snake_case for DB columns, camelCase for TypeScript field names
- Use Drizzle's `pgEnum` for all enum types
- Use Drizzle's `$onUpdate(() => new Date())` for `updated_at` fields (avoid Postgres triggers)
- Split schema across files in a `db/schema/` folder (one table per file, plus an `enums.ts` and an `index.ts` barrel export). This keeps the structure consistent with the one-component-per-file rule for the rest of the project.

### Tables

#### `organizations`

Multi-tenant root. Currently just one row for VeilCode/PlumbVoice.

- `id` uuid PK
- `name` text NOT NULL
- `created_at` timestamp DEFAULT now()

#### `users`

Internal team members (admins) and external client users (plumbers). A single table with a `role` field — no separate `client_users` table.

- `id` uuid PK
- `clerk_id` text UNIQUE NOT NULL
- `email` text NOT NULL
- `name` text
- `role` enum('admin', 'client') NOT NULL DEFAULT 'client'
- `organization_id` uuid FK → organizations.id (nullable)
- `customer_id` uuid FK → customers.id (nullable — only populated for client users)
- `deleted_at` timestamp (soft delete)
- `created_at` timestamp DEFAULT now()
- `updated_at` timestamp with `$onUpdate`
- Index on `clerk_id`
- Index on `customer_id`

#### `customers`

A plumbing business. One customer = one business.

- `id` uuid PK
- `business_name` text NOT NULL
- `owner_name` text NOT NULL
- `email` text NOT NULL
- `phone` text
- `address` text
- `city` text
- `state` text
- `timezone` text DEFAULT 'America/New_York'
- `service_area` text
- `stripe_customer_id` text UNIQUE
- `subscription_status` enum('trialing', 'active', 'past_due', 'canceled', 'paused') DEFAULT 'trialing'
- `plan` enum('pilot', 'standard') DEFAULT 'standard'
- `status` enum('onboarding', 'active', 'paused', 'churned') DEFAULT 'onboarding'
- `onboarded_at` timestamp
- `churned_at` timestamp
- `created_at` timestamp DEFAULT now()
- `updated_at` timestamp with `$onUpdate`
- Index on `stripe_customer_id`
- Index on `status`

#### `vapi_agents`

One per customer for now, but separate table to allow multi-agent setups later (e.g., day vs after-hours).

- `id` uuid PK
- `customer_id` uuid FK → customers.id NOT NULL
- `vapi_assistant_id` text UNIQUE NOT NULL
- `vapi_phone_number_id` text
- `twilio_number` text
- `status` enum('active', 'paused', 'error') DEFAULT 'active'
- `services_offered` jsonb (example: `[{"name": "leak repair", "ballpark_price": 150}]`)
- `pricing_table` jsonb (service-call fee, hourly rate, etc.)
- `business_hours` jsonb (example: `{"mon": {"open": "08:00", "close": "17:00"}, ...}`)
- `emergency_definition` text (what counts as emergency for this customer)
- `owner_name` text (used in prompts when AI references "let me have X call you back")
- `calendar_id` text (Google Calendar ID for booking)
- `created_at` timestamp DEFAULT now()
- `updated_at` timestamp with `$onUpdate`
- Index on `customer_id`
- Index on `vapi_assistant_id`

#### `calls`

One row per inbound call.

- `id` uuid PK
- `vapi_agent_id` uuid FK → vapi_agents.id NOT NULL
- `customer_id` uuid FK → customers.id NOT NULL (denormalized for query performance)
- `vapi_call_id` text UNIQUE NOT NULL
- `caller_phone` text
- `caller_name` text (extracted by AI)
- `started_at` timestamp NOT NULL
- `ended_at` timestamp
- `duration_seconds` integer
- `outcome` enum('booked', 'message_taken', 'transferred', 'dropped', 'abandoned')
- `urgency_level` enum('emergency', 'urgent', 'routine', 'unknown')
- `issue_summary` text (extracted by AI)
- `service_address` text (extracted by AI)
- `transcript` text (full transcript)
- `audio_url` text
- `created_at` timestamp DEFAULT now()
- Composite index on `(customer_id, started_at DESC)` — most common query: customer's recent calls
- Index on `vapi_call_id`
- Index on `outcome`

#### `bookings`

0 or 1 per call — only when outcome = 'booked'.

- `id` uuid PK
- `call_id` uuid FK → calls.id UNIQUE NOT NULL (one booking per call)
- `customer_id` uuid FK → customers.id NOT NULL
- `scheduled_at` timestamp NOT NULL
- `calendar_event_id` text
- `notes` text
- `created_at` timestamp DEFAULT now()
- Index on `(customer_id, scheduled_at)`

### Migration steps

After writing the schema:

1. Run `npx drizzle-kit generate` to create migration files
2. Run `npx drizzle-kit push` to apply to Neon
3. If push fails because the existing example schema conflicts, drop the conflicting tables first — no production data, safe to drop
4. Stay on `drizzle-kit push` for Phase 1 — we will switch to `generate` + `migrate` once we have real customer data. Do not change this without asking.

---

## Task 2: Clerk Webhook for User Sync

### Why

Clerk owns auth, our DB owns business state. When a user signs up, we need to create a corresponding row in our `users` table so we can join against Customers, Calls, etc. via foreign keys.

### Implementation

Install `svix` for signature verification:

```bash
npm install svix
```

Create the webhook endpoint at `app/api/webhooks/clerk/route.ts`:

- Accept POST requests
- Verify the `svix-id`, `svix-timestamp`, `svix-signature` headers using `svix.Webhook` with `CLERK_WEBHOOK_SECRET` from env
- Return 400 if verification fails
- Handle three event types:

  - **`user.created`** → INSERT into `users` with `clerk_id`, `email` (primary email), `name` (first + last), `role: 'client'`. Wrap in try/catch — if the user already exists (webhook retry), log and return 200.

  - **`user.updated`** → UPDATE the `users` row where `clerk_id = data.id`, updating `email`, `name`, `updated_at`. If no row exists, INSERT (handles the edge case where the webhook fires before initial creation).

  - **`user.deleted`** → UPDATE the `users` row, setting `deleted_at = now()`. Do NOT hard-delete (calls/bookings reference users via customer relationship).

- Return 200 on success
- Log all webhook events to console for now (structured logging comes later)

### Separation of concerns

Per the coding standards below, business logic must be separate from the route handler:

- `app/api/webhooks/clerk/route.ts` — verifies signature, parses event, delegates to a service
- `lib/services/users.ts` — contains `syncClerkUser`, `softDeleteUser`, etc. Pure functions that take parsed data and talk to the DB.
- The route handler should be thin: verify → parse → call service → return response.

### Environment variable

Add `CLERK_WEBHOOK_SECRET` to `.env.local` with a placeholder value:

```text
CLERK_WEBHOOK_SECRET=whsec_placeholder_set_in_clerk_dashboard
```

I will set the real value manually after this is deployed.

### Middleware exclusion

This route must be excluded from Clerk's middleware authentication (webhooks come from Clerk's servers, not authenticated users). Update `middleware.ts` to add `/api/webhooks/clerk` to the public routes / matcher exclusions.

---

## Task 3: Admin Role Guard

The `(admin)` route group currently lets any logged-in user in. Gate it to admin role only.

### Layout-level guard

Update `app/(admin)/layout.tsx`:

- Use Clerk's `auth()` from `@clerk/nextjs/server` to get `sessionClaims`
- Check `sessionClaims?.metadata?.role === 'admin'`
- If not admin, `redirect('/dashboard')` from `next/navigation`
- The layout must be an async server component

### Session claim configuration

For `sessionClaims.metadata` to be populated, Clerk's session token must be customized:

- In Clerk dashboard → Sessions → Customize session token
- Add: `{"metadata": "{{user.public_metadata}}"}`
- This exposes `publicMetadata` as `sessionClaims.metadata` on every request

If editing the session token via dashboard isn't possible in the current Clerk version, fall back to fetching the user's `publicMetadata` server-side via `clerkClient.users.getUser(userId)` in the layout. Use whichever pattern is current in Clerk's docs as of 2026 — search if unsure.

### Defense-in-depth

Add the same role check at the top of `app/(admin)/admin/page.tsx` and any future admin sub-routes. Layout guards can be bypassed in edge cases; page guards are belt-and-suspenders.

### Extract the check

Create `lib/auth/require-admin.ts` exporting a function `requireAdmin()` that:

- Calls `auth()`
- Returns `sessionClaims` if admin
- Calls `redirect('/dashboard')` if not

Use this helper in both the layout and the page so the check is defined once, not duplicated.

---

## Task 4: Verify Migrations Applied

After running `drizzle-kit push`:

1. Run `npx drizzle-kit studio` to open the schema browser
2. Verify all 6 tables exist: `organizations`, `users`, `customers`, `vapi_agents`, `calls`, `bookings`
3. Verify foreign keys are in place
4. Verify enums are created in Postgres:

```sql
SELECT typname FROM pg_type WHERE typtype = 'e';
```

If anything is missing, debug and fix before moving on.

---

## Task 5: Document Manual Steps (Do NOT Execute)

Create `docs/phase-1-manual-steps.md` with the following steps that the human (Frank) will perform after code is done:

1. Go to Clerk dashboard → Webhooks → Add Endpoint
2. URL: `https://<deployed-url>/api/webhooks/clerk` (or use ngrok for local testing)
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`
4. Copy the signing secret → paste into `.env.local` as `CLERK_WEBHOOK_SECRET`
5. Clerk dashboard → Sessions → Customize session token → add `{"metadata": "{{user.public_metadata}}"}`
6. Clerk dashboard → Users → find Frank's account → edit publicMetadata to `{"role": "admin"}`
7. Sign out and back in (refresh session token with new claim)
8. Verify: Frank can access `/admin`, a test second account gets redirected to `/dashboard`

---

## Coding Standards (Strict — Non-Negotiable)

These rules apply to all code written in this and every future Claude Code session for this project.

### File structure

- **One React component per file.** Never put multiple components in the same file, even small ones. If a parent component needs a small child component, create a separate file for the child. Co-locate by folder if related (e.g., `components/calls/calls-table.tsx`, `components/calls/calls-table-row.tsx`).
- **Business logic stays out of components and route handlers.** Extract into `lib/services/`, `lib/utils/`, or `lib/auth/` etc. Components handle UI and user interaction. Services handle the actual work.
- **Route handlers stay thin.** Verify → parse → delegate to service → return. No DB queries directly in route handlers.
- **Schema split across files.** One table per file under `db/schema/`. Enums in `db/schema/enums.ts`. Barrel export in `db/schema/index.ts`.

### Comments

- **Short-form only:** `// comment`. Never use block comments (`/* */`) for inline notes.
- **No decorative dashes, banners, or section dividers.** Do not write things like `// ----- USERS -----` or `// ============ AUTH HELPERS ============`. The file structure communicates organization, not comment art.
- **No long multi-line comments.** If something needs that much explanation, the code is wrong — refactor it.
- **Comment why, not what.** Skip comments that just restate the code (`// increment counter`).

### Components

- **Do not recreate shadcn primitives.** If shadcn provides `Button`, `Card`, `Dialog`, `Table`, `Select`, `Input`, etc. — use them. Never write a custom `<MyButton>` wrapper. Compose, don't reinvent.
- **Custom CSS animations preferred** over JS animation libraries (framer-motion, etc.) unless a specific case demands it. Use Tailwind's `transition-*`, `animate-*`, and custom `@keyframes` in `globals.css`.
- **Use shadcn's `cn()` utility** for conditional class names.

### Naming

- **Files:** kebab-case (`require-admin.ts`, `calls-table.tsx`)
- **Components:** PascalCase exports (`CallsTable`, `RequireAdmin`)
- **Functions and variables:** camelCase
- **DB columns:** snake_case
- **TypeScript fields:** camelCase (Drizzle handles the mapping)
- **Enums (TS):** PascalCase types, lowercase string values (`'admin'`, not `'ADMIN'`)

### Imports

- Use the `@/` path alias for everything inside `app/`, `components/`, `lib/`, `db/`
- Group imports: external packages → internal modules → types → relative imports
- No unused imports

### Errors

- Always handle errors explicitly in services and route handlers. No silent failures.
- Use `try/catch` around DB and external API calls
- Throw typed errors from services, catch them at the route boundary

---

## What I Want You to Watch For

If you find yourself doing any of these, stop and flag it to Frank:

- Installing packages beyond `svix` and `drizzle-zod` without asking
- Suggesting fields not in this schema spec ("improvements" are scope creep)
- Combining the route handler and service logic in the same file
- Putting multiple components in one file
- Writing decorative comment banners
- Switching the project from `drizzle-kit push` to `drizzle-kit migrate`
- Adding new libraries for things shadcn or Tailwind already cover

---

## Done Criteria

Phase 1 is complete when:

1. All 6 tables exist in Neon with correct schema, enums, FKs, and indexes
2. Clerk webhook is implemented and middleware excludes it from auth
3. `lib/services/users.ts` handles the sync logic, route handler is thin
4. `lib/auth/require-admin.ts` exists and is used in both `(admin)/layout.tsx` and `(admin)/admin/page.tsx`
5. `docs/phase-1-manual-steps.md` is created with the manual checklist
6. The code is committed with a clean message: `feat(phase-1): schema, clerk sync, admin guard`

Report back when done. Surface anything that didn't match this brief and explain why.
