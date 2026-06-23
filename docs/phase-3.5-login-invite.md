# Phase 3.5: Customer Login Invite Flow

> Instruction file for Claude Code. Read this entire document before making any changes.
> Coding standards from `docs/phase-1-foundation.md` apply to all code in this session.
> This is a targeted addition to the existing admin dashboard — do not modify any client dashboard files.

## Context

The admin can provision a customer and their Vapi agent, but currently has no way to give that customer access to their dashboard. This phase closes that gap by adding a Clerk-powered invitation flow.

When the admin sends an invite:

- Clerk emails the plumber with a signup link
- The plumber creates their account via that link
- Your webhook creates their `users` row with `customer_id` already set
- They land directly on `/dashboard` with their data — no pending screen

## Prerequisites

Verify these exist before starting:

- `NEXT_PUBLIC_APP_URL` in `.env.local` and Vercel env vars (e.g. `https://plumberanswered.vercel.app`)
- Clerk backend SDK available (`@clerk/nextjs/server`)
- `users` table has `customer_id` column (uuid, nullable, FK to customers)

---

## Task 1: Invite API route

Create `app/api/admin/customers/[id]/invite/route.ts`

### Logic

```text
1. Verify caller is admin (use requireAdmin() from lib/auth/require-admin.ts)
2. Parse customerId from route params
3. Fetch customer from DB — return 404 if not found
4. Check if a user already exists with this customer_id (query users table)
   - If yes: return 400 with JSON { error: "Customer already has an active login" }
5. Call Clerk's createInvitation API
6. On Clerk error code "already_invited": return 400 with { error: "Invitation already sent to this email" }
7. On success: return 200 with { success: true }
```

### Clerk invitation call

```typescript
import { clerkClient } from "@clerk/nextjs/server"

const client = await clerkClient()

await client.invitations.createInvitation({
  emailAddress: customer.email,
  publicMetadata: {
    role: "client",
    customer_id: customer.id,
  },
  redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  notify: true, // sends the email automatically
})
```

### Separation of concerns

- Route handler: verify admin → parse params → delegate → return response
- `lib/services/invitations.ts`: contains `sendCustomerInvite(customerId: string)` — fetches customer, checks for existing user, calls Clerk, returns result
- Route handler imports from the service, does not contain business logic directly

---

## Task 2: Fix Clerk webhook to handle invited users

Update `app/api/webhooks/clerk/route.ts`

### Current behavior (broken for invited users)

On `user.created`, inserts `users` row with `customer_id: null` regardless of invite metadata.

### Required behavior

On `user.created`:

```typescript
// extract metadata from the webhook payload
const publicMetadata = data.public_metadata as {
  role?: string
  customer_id?: string
} | undefined

const customerId = publicMetadata?.customer_id ?? null
const role = publicMetadata?.role === "admin" ? "admin" : "client"
```

If `customerId` is present:

- Insert `users` row with `customer_id` set and `role: 'client'`
- This user skips the pending screen and goes directly to the dashboard

If `customerId` is null:

- Insert `users` row with `customer_id: null` and `role: 'client'`
- This user hits the pending screen (organic signup path — correct behavior)

### Fallback if metadata is empty on webhook

Clerk sometimes delays metadata propagation. Add a fallback:

```typescript
// if publicMetadata is empty, fetch the full user from Clerk
if (!publicMetadata?.customer_id) {
  const clerkUser = await clerkClient().then(c => c.users.getUser(data.id))
  const meta = clerkUser.publicMetadata as { role?: string; customer_id?: string }
  customerId = meta?.customer_id ?? null
  role = meta?.role === "admin" ? "admin" : "client"
}
```

Only run this fallback if `customer_id` is not present in the webhook payload — avoid unnecessary Clerk API calls.

Update `lib/services/users.ts` — the `syncClerkUser` function should accept `customerId` and `role` as parameters rather than always defaulting to null/client.

---

## Task 3: Login status on customer detail page

Update `components/admin/customer-account-card.tsx`

### Data fetching

In `app/(admin)/admin/customers/[id]/page.tsx`, add a query alongside the existing customer fetch:

```typescript
// check if this customer has an active login
const linkedUser = await db
  .select({ id: users.id, email: users.email })
  .from(users)
  .where(and(
    eq(users.customerId, customerId),
    isNull(users.deletedAt)
  ))
  .limit(1)

// pass hasActiveLogin and linkedUserEmail as props to the account card
```

### UI changes in `customer-account-card.tsx`

Add a "Login status" row in the card:

- If `hasActiveLogin`: green dot (CSS, not an icon library) + "Login active" + the linked email in muted text
- If not `hasActiveLogin`: grey dot + "No login yet"

Add the invite button below the login status:

- If `hasActiveLogin`: render nothing (or a disabled "Login active" badge — your call)
- If not `hasActiveLogin`: render "Send login invite" button

### Invite button component

Create `components/admin/invite-button.tsx` — client component.

Props:

```typescript
type InviteButtonProps = {
  customerId: string
}
```

States (manage with useState):

- `idle` → renders "Send login invite" button
- `loading` → button disabled, text "Sending..."
- `success` → button replaced with "Invite sent ✓" text in green, no re-click possible
- `error` → button re-enabled, error message shown below in red text

On click:

```typescript
const res = await fetch(`/api/admin/customers/${customerId}/invite`, {
  method: "POST"
})
const data = await res.json()
if (!res.ok) {
  setState("error")
  setErrorMessage(data.error ?? "Something went wrong")
} else {
  setState("success")
}
```

Use CSS transitions for state changes — no animation library.

---

## Task 4: Verify the full flow works

After building, test end-to-end before marking done:

1. Create a test customer via the admin provisioning form (or use Hightower Plumbing seed data)
2. On the customer detail page, confirm login status shows "No login yet"
3. Click "Send login invite"
4. Check the target email inbox — Clerk invite email should arrive within 60 seconds
5. Click the invite link, create an account with a test email
6. Confirm you land on `/dashboard` (not `/dashboard/pending`)
7. Check Neon `users` table — confirm the new row has `customer_id` populated and `role: 'client'`
8. Go back to the admin customer detail page — confirm login status now shows "Login active"

If step 7 shows `customer_id: null`, the webhook metadata fix isn't working — debug the fallback Clerk fetch.

---

## Files to create or modify

### New files

- `app/api/admin/customers/[id]/invite/route.ts`
- `lib/services/invitations.ts`
- `components/admin/invite-button.tsx`

### Modified files

- `app/api/webhooks/clerk/route.ts` — metadata extraction fix
- `lib/services/users.ts` — accept customerId and role params in syncClerkUser
- `app/(admin)/admin/customers/[id]/page.tsx` — add linkedUser query
- `components/admin/customer-account-card.tsx` — login status + invite button

---

## Coding standards reminder

From `docs/phase-1-foundation.md`:

- One component per file — `invite-button.tsx` is its own file, not added to the account card file
- Business logic in `lib/services/invitations.ts` — not in the route handler
- Route handler: verify → parse → delegate → return
- Short comments only: `// comment`
- No decorative banners
- Use shadcn `Button` for the invite button — do not create a custom button element

---

## Done criteria

- [ ] Admin can send invite from customer detail page
- [ ] Invited user lands on `/dashboard` with `customer_id` populated — not on pending screen
- [ ] Organic signups (no invite) still hit pending screen
- [ ] Customer detail page shows login status accurately
- [ ] No manual Clerk dashboard intervention required at any point
- [ ] Committed: `feat(phase-3.5): customer login invite flow`

Report back when done. Confirm the end-to-end test in Task 4 passed before moving to Phase 4.
