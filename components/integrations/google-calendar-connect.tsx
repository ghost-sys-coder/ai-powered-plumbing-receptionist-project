"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const NOTICES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Google Calendar connected — the receptionist now books straight into it." },
  cancelled: { ok: false, text: "Connection cancelled. Nothing was changed." },
  expired: { ok: false, text: "That connection link expired. Please try again." },
  error: { ok: false, text: "Couldn't connect Google Calendar. Please try again." },
};

type Props = {
  customerId: string;
  // False until the platform has Google OAuth credentials configured.
  configured: boolean;
  connection: { accountEmail: string | null } | null;
  // Page to come back to after Google's consent screen.
  returnTo: string;
  // ?calendar=… result from the OAuth callback, if any.
  notice?: string | null;
};

export function GoogleCalendarConnect({ customerId, configured, connection, returnTo, notice }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const message = notice ? NOTICES[notice] : undefined;

  if (!configured && !connection) return null;

  const startUrl = `/api/integrations/google/start?customerId=${encodeURIComponent(customerId)}&returnTo=${encodeURIComponent(returnTo)}`;

  async function disconnect() {
    if (!confirm("Disconnect Google Calendar? The receptionist will take booking requests as messages instead.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't disconnect the calendar.");
        return;
      }
      router.replace(returnTo);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarCheck className="h-4 w-4" />
          Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {message && (
          <p className={message.ok ? "text-green-700 dark:text-green-400" : "text-destructive"}>
            {message.text}
          </p>
        )}
        {connection ? (
          <>
            <p>
              Connected to Google Calendar
              {connection.accountEmail ? (
                <>
                  {" "}as <span className="font-medium">{connection.accountEmail}</span>
                </>
              ) : null}
              . New bookings go straight into the main calendar, and busy times are respected.
            </p>
            <Button variant="outline" size="sm" onClick={disconnect} disabled={busy}>
              {busy ? "Disconnecting..." : "Disconnect"}
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              Let the receptionist see open times and book appointments directly into Google
              Calendar.
            </p>
            <Button asChild size="sm">
              <a href={startUrl}>Connect Google Calendar</a>
            </Button>
          </>
        )}
        {error && <p className="text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
