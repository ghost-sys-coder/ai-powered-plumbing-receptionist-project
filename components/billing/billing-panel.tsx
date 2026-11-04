"use client";

import { useState } from "react";
import { Check, Copy, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BillingSummary, BillingTone } from "@/lib/billing/summary";

const TONE: Record<BillingTone, string> = {
  good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  bad: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  neutral: "bg-muted text-muted-foreground",
};

const CURRENCIES = [
  { value: "usd", label: "US dollars" },
  { value: "cad", label: "Canadian dollars" },
  { value: "gbp", label: "British pounds" },
  { value: "aud", label: "Australian dollars" },
];

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// mode:
//   self  — the payer (business owner or agency staff): buttons go straight
//           to Stripe
//   staff — platform staff for a customer: checkout makes a link to send
export function BillingPanel({
  summary,
  mode,
  customerId,
  chooseCurrency = false,
  title = "Billing",
}: {
  summary: BillingSummary;
  mode: "self" | "staff";
  customerId?: string;
  chooseCurrency?: boolean;
  title?: string;
}) {
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currency, setCurrency] = useState<string>(summary.currency);

  async function go(kind: "checkout" | "portal") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/billing/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, currency: chooseCurrency ? currency : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      if (kind === "checkout" && mode === "staff") {
        setLink(data.url);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!summary.configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Billing isn&apos;t set up yet.</CardContent>
      </Card>
    );
  }

  const trialEnds = formatDate(summary.trialEndsAt);
  const periodEnd = formatDate(summary.periodEnd);
  const overIncluded = summary.includedMinutes > 0 && summary.minutesUsed > summary.includedMinutes;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[summary.tone]}`}>
          {summary.statusLabel}
        </span>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">{summary.priceText}</p>

        {summary.suspended && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            Calls are switched off until payment is sorted out. Update the card to switch them back on.
          </p>
        )}
        {summary.status === "past_due" && !summary.suspended && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            The last payment failed. Calls keep being answered while Stripe retries — update the card to avoid
            interruption.
          </p>
        )}

        {!summary.canStart && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {trialEnds && (
              <>
                <dt className="text-muted-foreground">Trial ends</dt>
                <dd>{trialEnds}</dd>
              </>
            )}
            {periodEnd && (
              <>
                <dt className="text-muted-foreground">
                  {summary.cancelAtPeriodEnd ? "Ends on" : trialEnds ? "First charge" : "Renews"}
                </dt>
                <dd>{periodEnd}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Minutes this period</dt>
            <dd className={overIncluded ? "font-medium" : undefined}>
              {summary.minutesUsed}
              {summary.includedMinutes > 0 && ` of ${summary.includedMinutes} included`}
            </dd>
          </dl>
        )}

        {summary.canStart && chooseCurrency && (
          <div className="max-w-56">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger aria-label="Billing currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {summary.canStart ? (
            <Button size="sm" onClick={() => go("checkout")} disabled={busy !== null}>
              {busy === "checkout" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "staff" ? "Create payment link" : summary.status === "none" ? "Start free trial" : "Subscribe"}
            </Button>
          ) : null}
          {summary.hasAccount && !(summary.canStart && summary.status === "none") && (
            <Button size="sm" variant="outline" onClick={() => go("portal")} disabled={busy !== null}>
              {busy === "portal" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Manage billing
            </Button>
          )}
        </div>

        {link && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Send this link to the business owner. It expires in 24 hours.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{link}</code>
              <Button size="sm" variant="outline" onClick={copy} aria-label="Copy payment link">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
