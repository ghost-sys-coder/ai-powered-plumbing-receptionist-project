# Phase 5: Landing Page — plumberanswered.com

> Instruction file for Claude Code. Read this entire document before making any changes.
> Coding standards from `docs/phase-1-foundation.md` apply to all code in this session.
> Do not touch any dashboard or admin files during this session.

## Architecture decision

The landing page lives inside the existing Next.js app as a route group:
`app/(marketing)/page.tsx`

This route group has its own layout (`app/(marketing)/layout.tsx`) that does not
include the dashboard nav, sidebar, or any authenticated UI. It renders standalone.

The root `app/page.tsx` should redirect to the marketing page:

```typescript
import { redirect } from "next/navigation"
export default function RootPage() {
  redirect("/")
}
```

Actually — make `app/(marketing)/page.tsx` the root by ensuring the marketing
layout wraps the root route. Structure:

```text
app/
  (marketing)/
    layout.tsx       ← clean layout, no auth UI
    page.tsx         ← the landing page
  (auth)/
    ...
  (dashboard)/
    ...
  (admin)/
    ...
```

The marketing layout has no Clerk provider wrapping — it is fully public.
Ensure `middleware.ts` excludes `/` from auth requirements (it should already
be public, but verify).

---

## Design direction

Dark background (`#0A0A0A`), white primary text, electric blue accent (`#2563EB`).
Professional without being corporate. Feels like a tool built by someone who
understands the trades — not a Silicon Valley startup that discovered plumbers.

Typography:

- Headings: bold, tight letter-spacing, large on desktop
- Body: `#A1A1AA` (zinc-400) — readable, not harsh white
- Accent text: `#2563EB`

No gradients on text. No glassmorphism. No hero illustrations.
The page should feel direct and confident, not decorated.

All animations defined in `globals.css`. No JS animation libraries.

---

## Page structure (7 sections)

### Section 1: Nav

`components/marketing/nav.tsx`

- Left: "PlumberAnswered" wordmark in white, bold
- Right: two links — "How it works" (anchor to #how-it-works), "Pricing" (anchor to #pricing)
- Right: "Book a call" button → links to your Cal.com booking URL
  Use env var: `NEXT_PUBLIC_BOOKING_URL`
- Sticky on scroll, background transitions from transparent to `#0A0A0A` with
  backdrop blur on scroll. CSS only — use scroll-driven animation or a small
  inline script. No library.
- Mobile: hide nav links, keep wordmark and "Book a call" button

---

### Section 2: Hero

`components/marketing/hero.tsx`

**Headline (H1):**

```text
Solo plumbers lose $40,000
a year in missed calls.
```

**Subheadline:**

```text
We built an AI receptionist that answers every call,
triages emergencies, and books jobs on your calendar.
Done-for-you in 48 hours. $250/month.
```

**Two CTAs, side by side:**

- Primary: "Call the demo — hear it yourself" → `tel:+15717438660`
  Style: solid blue button, large
- Secondary: "Book a setup call" → `NEXT_PUBLIC_BOOKING_URL`
  Style: outline white button, large

**Below the CTAs:**

```text
+1 (571) 743-8660 · Call now · No signup required
```

Small muted text. Makes it dead obvious what the primary CTA does.

**Fade-in animation on load:**

```css
@keyframes heroFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Apply with staggered delays: headline first (0ms), subheadline (150ms),
CTAs (300ms), below-CTA text (450ms). Use `animation-fill-mode: both`.

No hero image. No illustration. The copy carries the section.

---

### Section 3: Social proof bar

`components/marketing/social-proof-bar.tsx`

A single horizontal strip between hero and features. Dark gray background
(`#111111`), centered text.

Content (placeholder — update when real customers exist):

```text
"Built for solo plumbers. Tested in Florida, Texas, and Georgia."
```

When first customer provides a testimonial, replace with:

```text
★★★★★  "[quote]" — [Owner name], [Business name], [City]
```

Keep the component simple. One line of text, centered, subtle top/bottom border
in `#222222`. This section exists so it can be swapped quickly when proof exists.

---

### Section 4: How it works

`components/marketing/how-it-works.tsx`

ID: `how-it-works` (for nav anchor)

Section heading: "How it works"
Subheading: "Three steps. 48 hours. Then it runs itself."

Three steps in a horizontal row (desktop) / stacked (mobile):

```text
Step 1: You tell us about your business
We learn your services, pricing, hours, and what counts
as an emergency. Takes 20 minutes on a call with us.

Step 2: We build and configure your AI agent
We set everything up. You don't touch a dashboard.
Your dedicated number goes live within 48 hours.

Step 3: Every call gets answered
Your AI receptionist handles calls, triages urgency,
and books jobs on your calendar. You get a full log
of every call in your dashboard.
```

Each step: large step number in blue (`01`, `02`, `03`), heading, body text.
Connector line between steps on desktop (CSS border, not SVG).

Animate steps into view on scroll using CSS `@keyframes` with
`animation-play-state` toggled by an `IntersectionObserver` in a small
inline script. No library.

---

### Section 5: What the AI handles

`components/marketing/handles-section.tsx`

Heading: "What Sarah handles on every call"
(Sarah is the AI receptionist's name)

Two columns, 6 items total:

Left column:

- ✓ Routine bookings (leaks, drains, faucets, quotes)
- ✓ Emergency triage (flooding, burst pipes, sewage backup)
- ✓ After-hours calls with clear messaging

Right column:

- ✓ Caller name, address, and issue captured automatically
- ✓ Jobs booked directly onto your Google Calendar
- ✓ Full call transcript in your dashboard within minutes

Below the list, a callout box (dark border, slightly lighter background):

```text
"What if the AI says something wrong?"

We monitor every call. If something goes wrong, we fix
the prompt within 24 hours. You can pause the AI from
your dashboard in one click — calls fall back to your
voicemail instantly.
```

This preempts the #1 objection without waiting for the FAQ.

---

### Section 6: Pricing

`components/marketing/pricing.tsx`

ID: `pricing` (for nav anchor)

Heading: "Simple pricing. No contracts."

Two cards side by side (desktop) / stacked (mobile):

**Pilot card** (for first customers):

```text
Pilot
$500 setup + $150/mo

For our first 5 customers.
Locked in for 6 months in exchange
for a testimonial and case study.

[ Book a call ]

```text
Style: outline card, zinc border

**Standard card** (main offer):

```text
Standard                    ← "Most popular" badge
$1,500 setup + $250/mo

Everything included:
✓ Custom AI agent setup
✓ Dedicated US phone number
✓ Google Calendar integration
✓ Full call dashboard
✓ Weekly prompt tuning
✓ Monitoring and support
✓ No contract — cancel anytime

[ Book a setup call ]

```text
Style: blue border, slightly elevated — visually primary

Below both cards:
```text
Not sure yet? Call the demo number first.
+1 (571) 743-8660
```

---

### Section 7: FAQ + Footer

`components/marketing/faq.tsx`
`components/marketing/footer.tsx`

**FAQ — 5 questions using shadcn Accordion:**

Q: Will my customers know it's an AI?
A: Most don't on the first call. By the second or third, they don't care —
they just appreciate that someone answered. Customers care that their pipe
gets fixed, not how the receptionist sounds.

Q: What if I already have a business number?
A: We set up a new dedicated number for the AI. You can forward your existing
number to it, or give the new number to new customers going forward. Either works.

Q: What plumbing services does it handle?
A: We configure it specifically for your business — your services, your pricing,
your emergency definition. It's not a generic bot. It knows what you do.

Q: What happens if the AI can't handle something?
A: It takes a detailed message and tells the caller you'll call them back.
Nothing gets dropped. You see every call in your dashboard.

Q: How do I get started?
A: Book a 20-minute call. We'll ask about your business, answer your questions,
and if it's a fit, you're live within 48 hours.

**Footer:**

- Left: "PlumberAnswered" wordmark + "© 2026 VeilCode Studio"
- Right: email link (`NEXT_PUBLIC_SUPPORT_EMAIL` env var)
- Single line, minimal. No social links until there's content worth linking to.

---

## Environment variables needed

Add to `.env.local` and Vercel:

```text
NEXT_PUBLIC_BOOKING_URL=https://cal.com/your-link
NEXT_PUBLIC_DEMO_NUMBER=+15717438660
NEXT_PUBLIC_SUPPORT_EMAIL=frank@plumberanswered.com
```

Use `NEXT_PUBLIC_DEMO_NUMBER` everywhere the demo number appears so it
can be changed in one place.

---

## CSS animations to add to globals.css

```css
/* hero fade up */
@keyframes heroFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-hero-fade-up {
  animation: heroFadeUp 0.5s ease-out both;
}

/* scroll reveal for how-it-works steps */
@keyframes revealUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

.reveal-on-scroll {
  opacity: 0;
}

.reveal-on-scroll.revealed {
  animation: revealUp 0.4s ease-out both;
}

/* nav background on scroll */
.nav-scrolled {
  background-color: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #1a1a1a;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
```

For the scroll reveal, add a small inline script in `app/(marketing)/layout.tsx`
using `IntersectionObserver` — not a library:

```html
<script dangerouslySetInnerHTML={{ __html: `
  document.addEventListener('DOMContentLoaded', function() {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('revealed')
      }),
      { threshold: 0.15 }
    );
    document.querySelectorAll('.reveal-on-scroll')
      .forEach(el => observer.observe(el));
  });
` }} />
```

For the nav scroll behavior, add a similar inline script watching `window.scrollY`.

---

## File structure

```text
app/
  (marketing)/
    layout.tsx
    page.tsx

components/
  marketing/
    nav.tsx
    hero.tsx
    social-proof-bar.tsx
    how-it-works.tsx
    handles-section.tsx
    pricing.tsx
    faq.tsx
    footer.tsx
```

One component per file. No exceptions.
All components are server components unless they need interactivity
(nav scroll behavior, FAQ accordion = client components).

---

## What is NOT in scope

- Blog
- Case studies page
- Login link in nav (plumbers don't self-serve — remove friction)
- Cookie banner (add when legally required)
- Analytics (add Vercel Analytics after launch — one line)
- Social proof beyond the placeholder bar (add when first customer commits)

---

## Coding standards reminder

From `docs/phase-1-foundation.md`:

- One component per file
- Short comments only: `// comment`
- No decorative comment banners
- Use shadcn `Accordion` for FAQ — do not build a custom accordion
- CSS animations in `globals.css` — no JS animation libraries
- No custom button components — use shadcn `Button`

---

## Done criteria

- [ ] Landing page renders at root URL `/` without auth
- [ ] Dashboard and admin routes unaffected
- [ ] Demo number CTA works on mobile (taps to call)
- [ ] Nav anchors scroll to correct sections
- [ ] Booking URL links open correctly
- [ ] Page is readable on mobile (no horizontal scroll, text not tiny)
- [ ] Animations work on page load and scroll
- [ ] All env vars used via `process.env.NEXT_PUBLIC_*` — no hardcoded URLs
- [ ] Committed: `feat(phase-5): marketing landing page`

Report back when done with a screenshot of the rendered page.
