# Phase 7 — Multi-industry, multi-country receptionist

Goal: turn the plumbing-only receptionist into one product that can be
configured per client by **industry** (plumbing, HVAC, roofing, law firm,
medical clinic, …) and **country** (US, Canada, UK, Australia; Uganda as a
secondary market), then add **ElevenLabs Agents** as a second voice provider
next to Vapi.

Order of work:

1. **Industry + country profiles (this phase)** — Vapi only.
2. Voice-provider abstraction — refactor, no behaviour change.
3. ElevenLabs adapter + Twilio number purchase/import.
4. Rebrand the marketing site. Done: the product is now AnswerSteady (answersteady.com).

---

## 1. Model: two independent profiles

A customer's assistant is built from two profiles that are combined, not
nested — any industry can run in any country.

| Profile | Lives in | Owns |
|---|---|---|
| Industry | `lib/verticals/<id>.ts` | Business description, intake steps, safety rules, guardrails ("BOUNDARIES"), pricing labels, default services and emergency definition, booking noun, extraction descriptions, extra intake fields, whether live transfer is allowed, sensitivity tier |
| Country | `lib/regions/index.ts` | Emergency number, crisis line, phone-number length, address shape, gas emergency contact (or LPG cylinder advice), local term for a lawyer, timezones, display locale, label for state/province/county/district |

`buildAgentPrompt()` (`lib/templates/agent-prompt.ts`) keeps one shared core —
turn-taking, callback-number confirmation, emergency alerting, booking flow —
and fills the industry/country specific parts from the two profiles.

**Backwards compatibility:** `industry` and `country` are optional and default
to `plumbing` / `US`. For those defaults the prompt is byte-for-byte identical
to the pre-phase-7 prompt (verified across calendar/manual, transfer on/off,
and empty-config variants), so existing assistants are unaffected by a re-sync.

### Industries at launch (22)

| Category | Industries | File |
|---|---|---|
| Home services | plumbing, hvac, roofing, electrical, pest_control, locksmith, garage_door, appliance_repair, cleaning, landscaping | `home-services.ts` |
| Property & automotive | property_management, auto_repair | `property-auto.ts` |
| Health | clinic, dental, physiotherapy, veterinary | `health.ts` |
| Professional services | legal, accounting, insurance, real_estate | `professional.ts` |
| Personal services | salon_spa | `other.ts` |
| Other | general — fallback for any business; uses the business's own one-line description (`businessDescription`) | `other.ts` |

Notable per-industry rules: clinic and physiotherapy never offer live transfer
(emergencies go to the emergency number); legal, accounting and insurance are
`confidential` tier (no advice, never take ID/bank details); locksmiths verify
the caller is authorised before a lockout; auto repair, health, professional
and salon profiles don't collect a street address.

**Adding an industry:** add its id to `INDUSTRY_IDS` (`types.ts`), write the
profile — usually `tradeProfile({...})` for on-site trades, overriding only
what differs — and register it in `index.ts`. The `Record<IndustryId, …>` map
makes a missing profile a compile error. Until a dedicated profile exists, a
business can run on `general` with its own description.

In the SaaS phase these code profiles become **built-in templates** seeded into
the database, so the platform (and later agencies) can add or tweak industries
from the admin UI without a deploy. The `IndustryProfile` shape is the template
schema.

### Verification

`buildAgentPrompt` is checked against all 22 industries × 5 countries (110
prompts) for unfilled values, plumbing wording leaking into other industries,
911 in non-911 countries, live-transfer consistency, and step numbering; and
plumbing/US against the pre-phase-7 output byte-for-byte.

### Guardrails for regulated verticals

- **Legal:** no legal advice or outcome predictions; never imply the firm has
  taken the matter; confidentiality (never confirm who is a client); collect
  other-party names for conflict checks; court dates/deadlines drive urgency.
- **Clinic:** no diagnosis or medical advice; no results/prescriptions/other
  patients' information; minimum-necessary collection (no detailed symptoms,
  history, insurance or ID numbers); medical emergencies are told to hang up and
  call the local emergency number, and are never transferred or kept on the
  line.

### Countries

| | Emergency | Crisis line | Phone digits | Address asks for | Gas |
|---|---|---|---|---|---|
| US | 911 | 988 | 10 | street, city, state | utility line or 911 |
| CA | 911 | 9-8-8 | 10 | street, city, province | utility line or 911 |
| GB | 999 | Samaritans 116 123 | 11 | house/street, town, postcode | National Gas Emergency Service 0800 111 999 |
| AU | 000 | Lifeline 13 11 14 | 10 | street, suburb, state, postcode | distributor line or 000 |
| UG | 999 or 112 | — | 10 | area/village, road, landmark, district | LPG cylinder advice |

These strings are read to callers in emergencies. Verify any change against an
official source.

---

## 2. Data model and wiring (done)

Migration `db/migrations/0005_omniscient_doctor_strange.sql` — additive only;
defaults backfill every existing row as plumbing / US:

- `customers.industry` — text, NOT NULL, default `'plumbing'` (validated in TS
  against `INDUSTRY_IDS`; text rather than a pg enum so adding an industry
  needs no migration).
- `customers.country` — text, NOT NULL, default `'US'` (ISO 3166-1 alpha-2).
- `customers.business_description` — text, nullable. The business's own
  one-line description; required for `general`.
- `calls.intake_data` — jsonb, nullable. The industry's extra intake fields
  from each call.

Wired through:

- `lib/services/profile-input.ts` validates industry/country/description
  (unknown values are rejected, never defaulted). The customer PATCH only
  changes them when the form sends them.
- Create, edit, agent-config routes and `scripts/sync-vapi-analysis.ts` pass
  the profile into `ProvisioningConfig`.
- The Vapi webhook stores intake fields (`pickIntakeData`) using the
  customer's industry.
- Admin create/edit forms: grouped industry select, country select, business
  description, per-country timezone list and state/province label,
  per-industry pricing labels. On create, emergency definition and services
  prefill from the industry until the admin edits them.
- Client dashboard call detail shows intake fields; the address row only
  appears for industries that collect one.

### Deploying

**Apply the migration before deploying this code.** The new code reads the new
columns, so deploying first would break the admin pages, the webhook and the
sync script until the migration runs. Order:

1. `npx drizzle-kit migrate` against production (after
   `scripts/baseline-migrations.ts` if the history isn't baselined yet).
2. Deploy.
3. Optionally `npx tsx scripts/sync-vapi-analysis.ts` to push the small shared
   wording changes (tool description, "message left for the business") to
   existing assistants. Their prompts are unchanged.

### Not done yet (later in phase 7)

- `vapi_agents.recording_enabled` (default off for health) and a recording
  notice in the first message — see §4.
- Dashboard dates still format with `en-US`; switch to the country's locale.

### Tests

`npm test` (Vitest). Plumbing/US prompts are compared byte-for-byte with
fixtures produced by the original builder (`lib/templates/__fixtures__`), and
every industry × country combination is checked for unfilled values, leaked
plumbing wording, wrong emergency numbers, transfer rules and step numbering.

---

## 3. Telephony per country

- **Vapi-native numbers are US-only.** For CA/GB/AU, buy numbers in Twilio and
  import them into Vapi (and later ElevenLabs). UK and Australian numbers need
  a Twilio *regulatory bundle* (business name, address, ID) before purchase.
- **Uganda:** Twilio does not sell Ugandan numbers (confirm). Options: a local
  carrier/aggregator with SIP trunking (e.g. Africa's Talking) connected to
  Vapi/ElevenLabs by SIP, or forwarding the business's MTN/Airtel line to an
  international number (costly per minute). Per-minute AI costs are high
  relative to local pricing — price the Ugandan plan accordingly.
- **Owner SMS alerts** use Twilio; check sender rules per country (UK/AU allow
  alphanumeric sender IDs; Uganda may be cheaper via a local aggregator).

---

## 4. Privacy & compliance (decide before onboarding clinics or law firms)

Not legal advice — confirm with counsel in each market.

- **Call recording disclosure:** several US states require all-party consent
  (e.g. California, Florida, Illinois, Pennsylvania, Washington); UK, Canada
  and Australia require notice. Plan: add a short recording notice to the
  first message when recording is on.
- **Health data (clinics):** US HIPAA (BAAs needed with Vapi, ElevenLabs,
  Neon, Twilio, Clerk, and any LLM provider); Canada PIPEDA plus provincial
  health acts (e.g. Ontario PHIPA) and Quebec Law 25; UK GDPR special-category
  data; Australian Privacy Act (health information is sensitive information,
  and the small-business exemption does not apply to health providers);
  Uganda Data Protection and Privacy Act 2019 (register with the Personal Data
  Protection Office). Default clinics to recording off and short transcript
  retention.
- **Cross-border transfers:** calls from UK/CA/AU/UG are processed in the US by
  Vapi/OpenAI/ElevenLabs. Check the vendors' DPAs and transfer mechanisms, and
  whether ElevenLabs' data-residency options fit.
- **Language:** Quebec clients may need French; Ugandan callers may switch to
  Luganda or Swahili. Out of scope for phase 7; ElevenLabs' multilingual
  support is a factor in step 3.

---

## 5. Known gaps carried into step 2

- The prompt's current-date macro (`{{ "now" | date … }}`) and
  `{{customer.number}}` are Vapi Liquid syntax; ElevenLabs uses system dynamic
  variables. The prompt builder needs a provider-specific placeholder layer.
- Tool endpoints, webhook parsing, recordings, web calls and number
  provisioning are Vapi-shaped; step 2 moves them behind a `VoiceProvider`
  interface.
