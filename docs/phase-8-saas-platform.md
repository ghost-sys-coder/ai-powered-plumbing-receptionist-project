# Phase 8 — SaaS platform (agencies, billing, BYOK)

Target: sell the receptionist as a white-label SaaS to **agencies** that resell
it to local businesses, and **directly** to businesses. Setup must be
non-technical. Builds on phase 7 (industry and country profiles).

Status: design. Pricing figures are proposals pending the real Vapi cost per
minute from production call logs.

---

## 1. Tenancy model

```
Platform (us)  ─┬─ Agency A ─┬─ Client business ─ callers
                │            └─ Client business
                ├─ Agency B ─── …
                └─ House agency ─ businesses that buy from us directly
```

- `organizations` (already in the schema, "multi-tenant root") becomes the
  agency. Every `customers` row gets `organization_id`. Direct customers live
  in a **house agency**, so direct and reseller sales share one code path.
- Roles: `platform_admin` (us), `agency_owner` / `agency_member`, `client`.
  Today's `admin` maps to `platform_admin`.
- Every admin query is scoped to the caller's organization. This is the
  largest change: today all admin pages read every customer.
- Client businesses keep their own dashboard logins (as plumbers have today).

### Built (step 2)

- Migration `0006_stormy_vindicator.sql` (hand-edited): `user_role` gains
  `agency`; `organizations.is_house` (at most one house agency);
  `customers.organization_id` NOT NULL, backfilled to a new **"Direct
  customers"** house agency; `pending_invites` gains `role` and
  `organization_id` (client invites link a customer, agency invites an
  organization, enforced by a check constraint).
- Roles stay in Clerk `publicMetadata.role` (`admin` = platform, `agency`,
  `client`). Agency membership is read from `users.organization_id`, never
  from the session token. Kept our own tables rather than Clerk
  Organizations: fewer moving parts, and billing will hang off
  `organizations` anyway.
- `lib/auth/staff.ts` is the single access layer: `requireStaff`,
  `requirePlatformAdmin`, `customerScope`, `canAccessCustomer`. Every admin
  page and `/api/admin/*` route goes through it; customers outside the
  viewer's agency return 404. Seeding and agency management are
  platform-only. Recordings follow the same scope.
- `/admin/agencies` (platform only): create agencies, invite staff by email.
  The Clerk webhook links new staff to their agency via `pending_invites`.
  Invite links now also apply if Clerk's `user.updated` arrives before
  `user.created`.
- New customers: agency staff create in their own agency; platform admins pick
  the agency (default: the house agency).

**Deploy order:** the migration makes `customers.organization_id` required,
and the currently deployed code doesn't set it, so creating a customer fails
between migrating and deploying. Run the migration and deploy back to back.

### Not built yet

- Removing staff from an agency, renaming agencies, moving a customer between
  agencies.
- Owner vs member roles within an agency (needed with billing).
- Agency staff managing their own team (today platform admins send invites).

## 2. Non-technical setup

- **Platform-managed providers:** we hold the Vapi / ElevenLabs / Twilio
  accounts. Agencies never see an API key (BYOK in §5 is the opt-in exception).
- **Guided onboarding:** pick industry → optional "paste your website" to
  prefill services and hours → pick a voice → number is provisioned → browser
  test call → go live.
- **Calendar:** replace the service-account flow (share calendar, copy ID) with
  a "Connect Google Calendar" OAuth button; Outlook later.
- **Industry templates in the database:** the phase-7 code profiles become
  seeded templates that the platform can add to or edit without a deploy.

### Built (step 4, part 1)

- **Setup wizard** for new customers (Business → Location → Call handling →
  Booking → Review & launch) with per-step validation. Billing fields are
  platform-only and ignored server-side for agency staff.
- **"Connect Google Calendar"** (OAuth, offline access) on the admin customer
  page and the business's own agent page. Tokens are AES-256-GCM encrypted
  (`lib/crypto/secret-box.ts`) in `calendar_connections` (migration 0008).
  Connecting switches the receptionist to live booking on the account's
  primary calendar; disconnecting revokes the grant and switches to
  message-taking. Customers without a connection keep using the service
  account. The OAuth `state` is signed, expires in 15 minutes, and is bound
  to the browser by an httpOnly nonce cookie; return paths are same-origin only.
- **Switching it on** needs three environment variables (the button stays
  hidden until all are set):
  - `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` — a Google Cloud
    "Web application" OAuth client with redirect URI
    `<NEXT_PUBLIC_APP_URL>/api/integrations/google/callback` and the Google
    Calendar API enabled. Google requires app verification for the calendar
    scope before more than 100 users can connect; until then they see an
    "unverified app" screen.
  - `TOKEN_ENCRYPTION_KEY` — 32 random bytes, base64. Keep it stable:
    changing it invalidates stored connections.

### Built (step 4, part 2): phone numbers outside the US

- `lib/voice/phone-numbers.ts` decides where a number comes from per country:
  US → free Vapi number (unchanged); CA → bought on our Twilio account in the
  business's area code (falls back to any Canadian local number), then
  imported into Vapi; GB/AU → same, once `TWILIO_BUNDLE_SID_<CC>` (and
  `TWILIO_ADDRESS_SID_<CC>` if the bundle has a separate address) is set;
  UG → none (Twilio sells no Ugandan numbers; forward the business's line).
- `lib/twilio/numbers.ts` searches, buys and releases numbers. If the Vapi
  import fails the Twilio number is released straight away. Deleting a
  customer releases its Twilio number, but only numbers on our own account.
- When a country can't be served yet, setup still finishes without a number
  and the wizard says why. The customer page then shows **Add phone number**
  (`POST /api/admin/customers/[id]/phone-number`), e.g. after a bundle is
  approved. `vapi_agents.phone_number_source` records `twilio_imported`.
- Needs an upgraded (paid) Twilio account: trial accounts can hold one number.
  Each Twilio number costs roughly $1–5/month depending on country, on top of
  per-minute charges.

**Getting UK/AU bundles:** Twilio Console → Phone Numbers → Regulatory
Compliance → Bundles → Create, for "Local" numbers, end-user type "Business".
Approval takes about 1–3 business days (sometimes weeks). Put the approved
bundle SID (`BU…`) in Vercel as `TWILIO_BUNDLE_SID_GB` / `TWILIO_BUNDLE_SID_AU`.
One bundle covers all of our numbers in that country, because the numbers are
held by us, not by each end business.

Still to do in step 4: website import to prefill the wizard.

## 3. Billing (proposed)

Cost basis: ~$0.12–0.15/min all-in on Vapi, ~$0.09–0.11 on ElevenLabs; a
typical small business uses 300–800 min/month.

**Agency plans** — platform fee + metered minutes:

| Plan | Monthly | Clients | Minutes |
|---|---|---|---|
| Starter | $97 | up to 3 | $0.15/min |
| Pro | $297 | up to 25, agency branding | $0.14/min |
| Agency | $597 | unlimited, custom domain, priority support | $0.13/min |

Phone numbers $3/month each. 14-day trial with ~100 minutes.

**Direct plans** (house agency):

| Plan | Monthly | Included minutes | Overage |
|---|---|---|---|
| Basic | $199 | 500 | $0.30/min |
| Standard | $349 | 1,000 | $0.30/min |
| Pro | $599 | 2,000 | $0.30/min |

Direct prices sit at agency retail level so we don't undercut our own
agencies. Uganda gets separate local-currency pricing later.

Build needs: Stripe subscriptions + metered usage, per-call cost capture
(Vapi and ElevenLabs both report cost per call), per-plan client limits,
margin reporting per agency and client.

## 4. Provider layer

A `VoiceProvider` interface (create/update/delete agent, attach number,
recording, web-call token, parse webhook, parse/format tool calls) with Vapi
and ElevenLabs adapters. **Credentials are resolved per agency** (platform
account by default, the agency's own when BYOK is on), so BYOK needs no
rework later.

### Built (step 3)

- `lib/voice/types.ts` — `ReceptionistProvider` (create/update/delete agent,
  provision/attach number, live number, recording URL) and
  `ProviderCredentials`.
- `lib/voice/credentials.ts` — `resolveProviderCredentials(provider, orgId)`:
  the single place keys are chosen. Returns the platform key today; BYOK adds
  the agency lookup here.
- `lib/voice/vapi/provider.ts` — Vapi adapter. `vapi-provisioning.ts`
  functions now take a `VapiClient`, so they run against whichever account the
  credentials belong to (tools are upserted per account).
- `lib/voice/index.ts` — `getProvider(provider, orgId)` and
  `getCustomerReceptionist(customerId)`; admin routes, live phone lookup and
  recordings go through these.
- `lib/voice/tools/*` — provider-neutral handlers for check_availability,
  book_appointment and notify_owner_emergency (spoken text unchanged).
  `lib/voice/vapi/tool-route.ts` adapts Vapi's payload; the
  `/api/vapi/tools/*` URLs are unchanged.
- `vapi_agents.provider` (migration 0007, default `vapi`). The id columns keep
  their `vapi_` names and hold the provider's ids.

Still Vapi-specific: the event webhook (`/api/webhooks/vapi`), live-transfer
destination replies, the browser test call (`@vapi-ai/web`), and the prompt's
date/caller-number macros. The ElevenLabs adapter adds its own versions.

## 5. Bring your own key (BYOK)

Agencies on **Pro or Agency** may connect their own Vapi or ElevenLabs account.

- **Pricing:** platform fee + ~$0.02–0.03/min orchestration fee (minutes
  counted from our call records); no minute markup. Example: 10 clients ×
  500 min → $297 + 5,000 × $0.025 ≈ $422/month, nearly all margin.
- **Scope:** one connected account per agency to start. End businesses are
  always managed. Phone numbers in the agency's own account are used as-is.
- **Requirements:**
  - Keys encrypted at rest, write-only (never shown again), rotatable,
    validated on entry.
  - Per-account setup on connect: create our tools (check_availability,
    book_appointment, notify_owner, transferCall) in their account and store
    the tool ids per agency (today they are global).
  - Assistant-level server URLs and secrets, so nothing depends on their
    org-level webhook settings.
  - Scheduled drift check: re-run `verifyAnalysisPlan` and alert on failure.
    Customer-owned dashboards can strip our settings, which has already
    happened once on our own account.
  - Clear support boundary: their account's limits, billing and concurrency
    are theirs; surface provider errors in the agency dashboard.
- **Timing:** after billing. The provider layer (§4) is built BYOK-ready.

## 6. Roadmap

1. Phase 7 completion — tests, industry/country columns and forms (done);
   recording consent and locale formatting.
2. Agency multi-tenancy and roles (§1).
3. Provider layer, platform-managed (§4).
4. Guided onboarding, Google Calendar OAuth, automatic numbers (§2).
5. Billing and usage metering (§3).
6. White-label branding, then custom domains.
7. BYOK (§5).
8. Rename and agency-facing marketing site (name shortlist kept separately).

The ElevenLabs adapter can land any time after step 3.
