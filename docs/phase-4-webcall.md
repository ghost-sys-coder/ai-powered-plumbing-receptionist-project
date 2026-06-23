# Phase 4: Web Call Feature (Admin Dashboard)

> Instruction file for Claude Code. Read this entire document before making any changes.
> Coding standards from `docs/phase-1-foundation.md` apply to all code in this session.
> This feature is admin-only. Do not touch any client dashboard files.

## Context

This phase adds a browser-based voice call feature to the admin customer detail page.
The admin clicks "Test Agent" on `/admin/customers/[id]`, speaks into their microphone,
and the Vapi assistant responds exactly as it would on a real phone call.

The webhook fires on call end — the call appears in the DB and client dashboard
as a normal call with `caller_phone: null`.

## How it works (architecture)

```text
Admin clicks "Test Agent"
→ POST /api/admin/web-call/token { assistantId }
  → server fetches vapiAssistantId from DB using customerId
  → server calls Vapi API to create a web call token
  → returns { token } to browser
→ browser initialises @vapi-ai/web SDK with the token
→ WebRTC session starts — admin speaks, assistant responds
→ on call end, Vapi fires end-of-call-report webhook
→ call appears in calls table as normal
```

The `VAPI_API_KEY` never touches the browser. It stays server-side in the token endpoint.

---

## Task 1: Install the Vapi web SDK

```bash
npm install @vapi-ai/web
```

No other packages required. Do not install framer-motion, react-spring, or any
animation library — CSS animations only per coding standards.

---

## Task 2: Token endpoint

Create `app/api/admin/web-call/token/route.ts`

### Logic

```text
1. Verify caller is admin (use requireAdmin() from lib/auth/require-admin.ts)
2. Parse customerId from request body: { customerId: string }
3. Fetch the vapi_agents row for this customerId
   - If not found: return 404 { error: "No agent found for this customer" }
   - If agent status is not 'active': return 400 { error: "Agent is not active" }
4. Call Vapi API to create a web call token
5. Return { token, assistantId } to the browser
```

### Vapi token API call

Vapi does not have a dedicated "web call token" endpoint in all SDK versions.
Use this approach — create a transient web call via the Vapi REST API:

```typescript
const response = await fetch("https://api.vapi.ai/call/web", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.VAPI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    assistantId: agent.vapiAssistantId,
  }),
})

if (!response.ok) {
  const error = await response.json()
  console.error("[web-call-token] Vapi API error", error)
  return Response.json({ error: "Failed to create web call" }, { status: 502 })
}

const data = await response.json()
// data contains { token, id } — return the token to the browser
return Response.json({ token: data.token, callId: data.id })
```

### Separation of concerns

- `app/api/admin/web-call/token/route.ts` — verify admin, parse body, delegate, return
- `lib/services/web-call.ts` — contains `createWebCallToken(customerId: string)`
  fetches agent from DB, calls Vapi API, returns token

---

## Task 3: useVapiCall hook

Create `lib/hooks/use-vapi-call.ts`

This is a client-side hook managing the full call lifecycle.

### State shape

```typescript
type CallState = "idle" | "requesting" | "connecting" | "active" | "ending" | "ended" | "error"

type UseVapiCallReturn = {
  callState: CallState
  isMuted: boolean
  errorMessage: string | null
  startCall: () => Promise<void>
  endCall: () => void
  toggleMute: () => void
}
```

### Implementation

```typescript
"use client"

import { useRef, useState, useCallback } from "react"
import Vapi from "@vapi-ai/web"

export function useVapiCall(customerId: string): UseVapiCallReturn {
  const vapiRef = useRef<Vapi | null>(null)
  const [callState, setCallState] = useState<CallState>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const startCall = useCallback(async () => {
    setCallState("requesting")
    setErrorMessage(null)

    try {
      // fetch token from server
      const res = await fetch("/api/admin/web-call/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to get call token")
      }

      const { token } = await res.json()

      setCallState("connecting")

      // initialise Vapi with the token
      const vapi = new Vapi(token)
      vapiRef.current = vapi

      // bind events
      vapi.on("call-start", () => setCallState("active"))
      vapi.on("call-end", () => {
        setCallState("ended")
        vapiRef.current = null
      })
      vapi.on("error", (err) => {
        console.error("[useVapiCall] error", err)
        setErrorMessage(err?.message ?? "Call error occurred")
        setCallState("error")
        vapiRef.current = null
      })

      // start the call — token-based calls don't need assistantId again
      await vapi.start(token)

    } catch (err) {
      console.error("[useVapiCall] startCall failed", err)
      setErrorMessage((err as Error).message)
      setCallState("error")
    }
  }, [customerId])

  const endCall = useCallback(() => {
    setCallState("ending")
    vapiRef.current?.stop()
  }, [])

  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return
    const next = !isMuted
    vapiRef.current.setMuted(next)
    setIsMuted(next)
  }, [isMuted])

  return { callState, isMuted, errorMessage, startCall, endCall, toggleMute }
}
```

Note: `@vapi-ai/web` Vapi constructor accepts either a public key or a token.
When using a token from `/call/web`, pass the token directly to `new Vapi(token)`
and also to `vapi.start(token)`. If the SDK version installed behaves differently
(e.g. requires public key in constructor), adapt accordingly — check the installed
SDK's type definitions before writing.

---

## Task 4: WebCallButton component

Create `components/admin/web-call-button.tsx`

Client component. Uses the `useVapiCall` hook. Renders a single button that
changes appearance based on call state.

### Props

```typescript
type WebCallButtonProps = {
  customerId: string
}
```

### Button states and labels

| callState    | Button label        | Button style         | Disabled? |

|-------------|---------------------|---------------------|-----------|
| idle         | "Test Agent"        | outline              | no        |
| requesting   | "Connecting..."     | muted, no border     | yes       |
| connecting   | "Starting call..."  | muted, no border     | yes       |
| active       | "End call"          | destructive red      | no        |
| ending       | "Ending..."         | muted                | yes       |
| ended        | "Call ended"        | outline, muted       | yes       |
| error        | "Retry"             | outline              | no        |

Use shadcn `Button` with appropriate variants. Do not create a custom button element.

### Mute toggle

When `callState === "active"`, render a second small button next to the end button:

- If not muted: "Mute"
- If muted: "Unmute"

### Error message

When `callState === "error"`, render `errorMessage` below the button in small red text.
On "Retry" click, call `startCall()` again and reset state.

### CSS animation for active state

When the call is active, add a subtle pulse ring around the "End call" button
to visually communicate the call is live. Define in `globals.css`:

```css
@keyframes callPulse {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.animate-call-pulse {
  animation: callPulse 1.5s ease-out infinite;
}
```

Apply `animate-call-pulse` to the button wrapper div when `callState === "active"`.

---

## Task 5: WebCallPanel component

Create `components/admin/web-call-panel.tsx`

Client component. Wraps the call button with context — shows what agent is being
tested and provides a clean visual container.

### Prop

```typescript
type WebCallPanelProps = {
  customerId: string
  agentStatus: "active" | "paused" | "error"
  phoneNumber: string | null
  ownerName: string | null
}
```

### Layout

A shadcn `Card` with:

- Card header: "Test Agent" title + description "Speak to the AI as if you were a customer calling"
- If `agentStatus !== 'active'`: show a warning banner "Agent is currently paused — activate it before testing" and disable the call button
- Body: the `WebCallButton` component
- Footer (muted text): "Web calls are billed at the same rate as phone calls"

### File split

- `components/admin/web-call-panel.tsx` — the card wrapper (this file)
- `components/admin/web-call-button.tsx` — the button logic (separate file, Task 4)

`WebCallPanel` imports `WebCallButton`. They are separate files.

---

## Task 6: Wire into customer detail page

Update `app/(admin)/admin/customers/[id]/page.tsx`

Add the `WebCallPanel` below the agent status card.

Pass these props from the existing page data:

- `customerId` — from route params (already fetched)
- `agentStatus` — from the `vapi_agents` row (already fetched)
- `phoneNumber` — from `vapi_agents.phone_number`
- `ownerName` — from `vapi_agents.owner_name`

No new DB queries needed — all data already exists on this page from the
customer detail fetch.

---

## Task 7: Middleware exclusion

Verify `/api/admin/web-call/token` is NOT in the public routes in `middleware.ts`.
This endpoint must require authentication — it should only be accessible to
logged-in admin users. The `requireAdmin()` check inside the handler enforces
role, but Clerk middleware must still require login.

Unlike the Vapi and Clerk webhook endpoints, this is not a public route.
If it is currently in the public routes matcher, remove it.

---

## Environment variables

No new env vars needed beyond what is already set:

- `VAPI_API_KEY` — already in `.env.local` and Vercel (confirmed)

---

## Known edge cases to handle

**Microphone permission denied:**
The browser will reject `vapi.start()` if mic permission is denied.
The Vapi SDK throws an error — your `vapi.on("error")` handler catches it
and sets `callState: "error"` with the message. No special handling needed
beyond what's already in the hook.

**User navigates away during active call:**
Add a cleanup in the hook:

```typescript
// in useVapiCall, add cleanup on unmount
import { useEffect } from "react"

useEffect(() => {
  return () => {
    // stop call if component unmounts during active call
    if (vapiRef.current) {
      vapiRef.current.stop()
    }
  }
}, [])
```

**Call ends before webhook fires:**
The call will appear in the DB only after `end-of-call-report` fires, which
can take 5–30 seconds after the call ends. This is expected. Do not add a
loading state for this — just let the call end normally.

**Agent has no `vapiAssistantId`:**
The token endpoint returns 404. The hook catches it and sets error state.
The `WebCallPanel` shows "Retry". No special handling beyond what's already built.

---

## What this does NOT build

- Live transcript display during the call (Vapi web SDK emits transcript
  events but displaying them adds significant complexity — skip for now)
- Call recording playback in the panel (recordings come via webhook after
  call ends, not during — out of scope)
- Client dashboard web call (admin only, per the original requirement)

---

## Coding standards reminder

From `docs/phase-1-foundation.md`:

- One component per file — `web-call-button.tsx` and `web-call-panel.tsx`
  are separate files. Do not combine them.
- Hook in `lib/hooks/use-vapi-call.ts` — not inside a component file
- Business logic in `lib/services/web-call.ts` — not in the route handler
- Route handler thin: verify admin → parse body → delegate → return
- Short comments only: `// comment`
- No decorative banners or block comments
- Use shadcn `Button` — do not create custom button elements
- CSS animations in `globals.css` — no JS animation libraries

---

## Done criteria

- [ ] "Test Agent" button renders on `/admin/customers/[id]` below agent status card
- [ ] Clicking it requests mic permission and connects to the Vapi assistant
- [ ] Admin can speak and receive responses from the AI
- [ ] Call pulse animation shows while call is active
- [ ] "End call" terminates the WebRTC session cleanly
- [ ] After call ends, a new row appears in the `calls` table in Neon within 60 seconds
- [ ] Paused agents show warning and disabled button
- [ ] Navigating away during a call stops the call cleanly
- [ ] `VAPI_API_KEY` is never exposed in browser network requests
- [ ] Committed: `feat(phase-4): web call feature on admin customer detail`

Report back when done. Confirm the call appears in Neon after ending before
marking this complete.
