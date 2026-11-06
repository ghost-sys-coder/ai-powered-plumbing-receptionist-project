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

### Built (step 4, part 3): website import, on any AI vendor

The first wizard step has **Fill from website**: staff type the business's address and the form is prefilled (name, industry, contact details, address, country and timezone, hours, services and stated prices). Nothing is saved until staff review each step and launch.

- `lib/ai/` is a provider-neutral layer: `generateStructured()` asks for output matching a JSON schema. Adapters for Anthropic (forced tool call) and OpenAI (strict `json_schema` output) use plain `fetch`, no SDKs. `AI_PROVIDER=anthropic|openai` picks the preferred vendor (default Anthropic); if it fails, the next configured vendor is tried automatically. `AI_MODEL_ANTHROPIC` / `AI_MODEL_OPENAI` override the defaults (`claude-haiku-5-5`, `gpt-5.4-mini`). A vendor is available when its key (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) is set; adding a vendor is one adapter. Future AI features (call summaries, BYOK for agencies) should go through this layer.
- `lib/website-import/fetch-site.ts` reads the page plus up to four same-site contact/about/services/pricing pages. User-supplied URLs are checked against private and internal addresses on every redirect hop, with size, time and redirect caps. The reader identifies itself honestly as a bot; sites that block bots (401/403/429) or render everything in JavaScript get a clear "fill it in by hand" message rather than a workaround.
- `lib/website-import/extract.ts` prompts the model to use only stated facts (null otherwise, never guessed prices), treats page text as data rather than instructions, and `sanitizeImport()` keeps only well-formed values (known industry/country, a timezone belonging to that country, HH:MM hours, valid email).
- `POST /api/admin/customers/import-website` (staff only) returns the proposed fields in the same shape as "Fill from JSON", so both share one fill routine.

Tested live with both vendors against a real Australian dental practice: about 3 s (Claude) and 5 s (GPT) for the model call. Many small-business sites block bots or are JavaScript-only, so treat this as a head start, not a guarantee.

## 3. Billing

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

### Built (step 5): Stripe subscriptions and metered minutes

Running in Stripe **test mode** on the VeilCode Studio account. Everything we create there is tagged `app=receptionist` (the account also sells other products, which the webhook ignores).

**Who pays.** `billing_accounts` (migration 0009) has one row per payer. A *direct* account is a house-agency customer, billed individually. An *agency* account is billed once for all its clients, and the agency bills its own clients. Pilot customers are never billed. `lib/billing/accounts.ts` decides which applies to a customer.

**Prices.** `lib/billing/plans.ts` is the only place prices live. Each plan has a monthly fee plus metered minutes, priced separately in USD, CAD, GBP and AUD; Uganda pays in USD. There's a 14-day trial with a card required, for first subscriptions only.

`scripts/stripe-setup.ts` creates the meter, products, prices (with versioned lookup keys) and the customer-portal configuration. It's idempotent; dry-run by default, `--apply` to create. To change prices, bump `PRICE_VERSION`, edit the amounts and re-run. Existing subscribers keep their old price until moved.

**Plans (price version v2).** The tiered plans above are live in code (`lib/billing/plans.ts`) and Stripe test mode. There's one Stripe product per plan, plus a monthly price and a metered minutes price per currency. Direct plans include minutes and then charge $0.30/min; agency plans are pure per-minute.

| Plan | USD | CAD | GBP | AUD |
|---|---|---|---|---|
| Direct Basic (500 min) | $199 | CA$269 | £159 | A$299 |
| Direct Standard (1,000 min) | $349 | CA$479 | £279 | A$529 |
| Direct Pro (2,000 min) | $599 | CA$819 | £479 | A$899 |
| Direct overage /min | $0.30 | CA$0.40 | £0.24 | A$0.45 |
| Agency Starter | $97 + $0.15/min | CA$129 + 0.20 | £79 + 0.12 | A$149 + 0.23 |
| Agency Pro | $297 + $0.14/min | CA$399 + 0.19 | £239 + 0.11 | A$449 + 0.21 |
| Agency (unlimited) | $597 + $0.13/min | CA$799 + 0.18 | £469 + 0.10 | A$889 + 0.20 |

The CAD, GBP and AUD prices are rounded local prices, not exact conversions. A test checks that no direct plan is priced at or below the matching agency plan.

**Picking and changing plans.** The payer picks a plan in the billing panel before checkout. With a live subscription, **Change plan** (`POST /api/billing/plan`) swaps both subscription items in place. The monthly fee is prorated, and minutes used so far in the period are billed at the new plan's rates. `billing_accounts.plan` (migration 0010) mirrors the plan and is read back from the price metadata on every subscription webhook.

**Flows.**
- *Business owners:* Dashboard → Billing goes to Stripe Checkout (start the trial) or the Stripe portal (card, invoices, cancel).
- *Agency staff:* Admin → Billing. They pick their billing currency at first checkout.
- *Platform staff:* a direct customer's page has a Billing card that **creates a payment link** to send to the owner, which expires after 24 hours. Admin → Billing lists every account.

**Usage.** On `end-of-call-report`, `reportCallUsage()` rounds each call up to whole minutes and sends a meter event whose identifier is the call id. `calls.usage_reported_at` claims each call exactly once, and Stripe also rejects duplicate identifiers, so webhook retries never double-bill. Only subscribed accounts in good standing are metered. Calls before a subscription are marked with `billed_minutes = 0`.

**Sync and suspension.** `POST /api/webhooks/stripe` verifies the signature and then re-reads the subscription from Stripe, so out-of-order or replayed events are harmless.
- `past_due` keeps calls running while Stripe retries the payment (the grace period).
- `unpaid`, `canceled` and other lapsed states disconnect the account's phone numbers, but only when `BILLING_ENFORCEMENT=on`. Leave it off until the pricing is final.
- Paying again reconnects only the receptionists that billing switched off (`vapi_agents.billing_suspended_at`).

**Env.** Set `STRIPE_SECRET_KEY` (a restricted key is fine) and `STRIPE_WEBHOOK_SECRET`, plus `BILLING_ENFORCEMENT=on` once ready. `scripts/stripe-webhook-setup.ts <origin>` creates the webhook endpoint and saves its secret to `.env.local`. For live mode, repeat both scripts with the live key.

**Live mode (Nov 6).** The live meter, products, prices, portal configuration and webhook endpoint (`we_1UYamhHiapzsY1CyJab4Q8fm` → `/api/webhooks/stripe`) all exist. `billing_accounts.livemode` (migration 0011) records which Stripe mode each account's customer belongs to. Accounts from the other mode are ignored and get a fresh customer at their next checkout, so test data never mixes with live billing. The admin billing table labels them.

**Agency client limits.** These are enforced when agency staff add a client (`lib/billing/limits.ts`), and on plan changes that would cover fewer clients than the agency has. The limit only applies with a subscription in good standing; platform admins can always add.

**Usage catch-up.** A daily Vercel cron (`vercel.json` → `/api/cron/billing-usage`) re-sends any finished call whose minutes never reached Stripe. If `CRON_SECRET` is set, it must be sent as a bearer token. Without it, only Vercel's cron user agent is accepted; the sweep is safe to run repeatedly either way.

**Not built yet:**
- Phone-number fees ($3/month per number in the proposal).
- The agency trial's ~100 included minutes.

### Proposal: industry pricing

Today every business pays the same for a tier, whatever its industry. A law firm gets far more value from each answered call than a cleaner does. Legal intake calls also run longer and need more care. Two options:

1. **Two price books, chosen by industry (recommended).** "Standard" covers home services, personal services, property and auto, and other. "Professional" covers legal, accounting, insurance, real estate and health. Same three tiers and the same minutes, about 1.5× the price: Professional Basic $299, Standard $499, Pro $849, then $0.40/min. The book follows the customer's industry, which staff set at setup, so customers can't pick a cheaper one. The industry profiles already carry the category (`lib/verticals`), so no new data is needed. Agency prices stay flat; agencies set their own retail prices and keep the premium themselves.
2. **One price plus an add-on.** Keep today's tiers and sell a "Professional intake" add-on (longer intake scripts, conflict-check questions, CRM hand-off). This is simpler to explain, but the add-on features have to be built first.

Rough effort for option 1: half a day. Plans gain a price book, Stripe gets one product set per book, checkout picks the book from the industry category, and the landing page says "from $199" with a line for professional practices.

- A daily sweep that re-reports calls whose meter event failed (today these are only logged).
- Margin reporting.

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
