"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, CreditCard, ExternalLink, Link2, Loader2, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BillingSummary, BillingTone } from "@/lib/billing/summary";
import { cn } from "@/lib/utils";

const TONE: Record<BillingTone, { pill: string; dot: string }> = {
  good: {
    pill: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  warn: { pill: "bg-amber-500/10 text-amber-800 ring-amber-600/25 dark:text-amber-300", dot: "bg-amber-500" },
  bad: { pill: "bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-300", dot: "bg-red-500" },
  neutral: { pill: "bg-muted text-muted-foreground ring-foreground/10", dot: "bg-muted-foreground/60" },
};

const CURRENCIES = [
  { value: "usd", label: "US dollars (USD)" },
  { value: "cad", label: "Canadian dollars (CAD)" },
  { value: "gbp", label: "British pounds (GBP)" },
  { value: "aud", label: "Australian dollars (AUD)" },
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
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically — select the link and copy it.");
    }
  }

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <CreditCard strokeWidth={1.75} className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {summary.plan === "agency" ? "One bill for all your clients" : "AI receptionist plan"}
          </p>
        </div>
      </div>
      {summary.configured && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
            TONE[summary.tone].pill
          )}
        >
          <span className={cn("size-1.5 rounded-full", TONE[summary.tone].dot)} />
          {summary.statusLabel}
        </span>
      )}
    </div>
  );

  if (!summary.configured) {
    return (
      <Card className="gap-4 py-0 pb-6">
        {header}
        <p className="px-6 text-sm text-muted-foreground">Billing isn&apos;t set up yet.</p>
      </Card>
    );
  }

  const trialEnds = formatDate(summary.trialEndsAt);
  const periodEnd = formatDate(summary.periodEnd);
  const included = summary.includedMinutes;
  const usedPct = included > 0 ? Math.min(100, Math.round((summary.minutesUsed / included) * 100)) : 0;
  const over = included > 0 && summary.minutesUsed > included;

  return (
    <Card className="gap-0 py-0">
      {header}

      {/* Price */}
      <div className="px-6 pt-5">
        <div className="flex items-baseline gap-1.5">
          <span className="tabular text-[2.25rem] font-semibold leading-none tracking-[-0.035em]">
            {summary.monthlyText}
          </span>
          <span className="text-sm text-muted-foreground">/ month</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {included > 0
            ? `${included} minutes included, then ${summary.perMinuteText} per minute`
            : `Plus ${summary.perMinuteText} per minute answered`}
        </p>
      </div>

      {/* Alerts */}
      {(summary.suspended || summary.status === "past_due") && (
        <div className="px-6 pt-5">
          {summary.suspended ? (
            <div className="flex gap-3 rounded-xl bg-red-500/[0.07] p-3.5 text-sm text-red-800 ring-1 ring-inset ring-red-600/15 dark:text-red-300">
              <PhoneOff strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
              <p>Calls are switched off until payment is sorted out. Update the card to switch them back on.</p>
            </div>
          ) : (
            <div className="flex gap-3 rounded-xl bg-amber-500/8 p-3.5 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20 dark:text-amber-200">
              <AlertTriangle strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
              <p>The last payment failed. Calls keep being answered while it&apos;s retried — update the card to avoid any interruption.</p>
            </div>
          )}
        </div>
      )}

      {/* Usage + dates */}
      {!summary.canStart && (
        <div className="px-6 pt-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">Minutes this period</span>
            <span className="tabular text-muted-foreground">
              <span className={cn("font-semibold text-foreground", over && "text-amber-700 dark:text-amber-300")}>
                {summary.minutesUsed.toLocaleString()}
              </span>
              {included > 0 && ` / ${included.toLocaleString()} included`}
            </span>
          </div>
          {included > 0 && (
            <div
              className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-foreground/4"
              role="progressbar"
              aria-valuenow={summary.minutesUsed}
              aria-valuemin={0}
              aria-valuemax={included}
              aria-label="Included minutes used"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700 ease-out",
                  over ? "bg-amber-500" : "bg-linear-to-r from-primary/80 to-primary"
                )}
                style={{ width: `${Math.max(usedPct, summary.minutesUsed > 0 ? 2 : 0)}%` }}
              />
            </div>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border/70 ring-1 ring-border/70">
            {trialEnds && (
              <div className="bg-card px-4 py-3">
                <dt className="text-xs text-muted-foreground">Trial ends</dt>
                <dd className="mt-0.5 text-sm font-medium">{trialEnds}</dd>
              </div>
            )}
            {periodEnd && (
              <div className="bg-card px-4 py-3">
                <dt className="text-xs text-muted-foreground">
                  {summary.cancelAtPeriodEnd ? "Ends on" : trialEnds ? "First charge" : "Renews"}
                </dt>
                <dd className="mt-0.5 text-sm font-medium">{periodEnd}</dd>
              </div>
            )}
            {!trialEnds && !periodEnd && (
              <div className="col-span-2 bg-card px-4 py-3 text-sm text-muted-foreground">Waiting for Stripe…</div>
            )}
          </dl>
        </div>
      )}

      {/* Currency choice (agencies, first checkout) */}
      {summary.canStart && chooseCurrency && (
        <div className="px-6 pt-5">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Billing currency</label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger aria-label="Billing currency" className="w-full sm:w-64">
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

      {/* Payment link (staff) */}
      {link && (
        <div className="px-6 pt-5">
          <div className="rounded-xl bg-muted/50 p-4 ring-1 ring-inset ring-foreground/6">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Link2 strokeWidth={1.75} className="size-4 text-primary" />
              Payment link ready
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Send it to the business owner. It expires in 24 hours.
            </p>
            <div className="@container mt-3">
            <div className="flex min-w-0 flex-wrap gap-2">
              <Input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Payment link"
                className="min-w-0 flex-1 basis-full font-mono text-xs md:text-xs @sm:basis-0"
              />
              <Button type="button" variant="outline" onClick={copy} className="shrink-0">
                {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button type="button" variant="outline" size="icon" asChild className="shrink-0">
                <a href={link} target="_blank" rel="noreferrer" aria-label="Open payment link">
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="px-6 pt-4 text-sm text-destructive">{error}</p>}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/30 px-6 py-4">
        {summary.canStart && (
          <Button onClick={() => go("checkout")} disabled={busy !== null}>
            {busy === "checkout" && <Loader2 className="size-4 animate-spin" />}
            {mode === "staff"
              ? link
                ? "Create a new link"
                : "Create payment link"
              : summary.status === "none"
                ? "Start 14-day free trial"
                : "Subscribe"}
          </Button>
        )}
        {summary.hasAccount && !(summary.canStart && summary.status === "none") && (
          <Button variant="outline" onClick={() => go("portal")} disabled={busy !== null}>
            {busy === "portal" ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
            Manage billing
          </Button>
        )}
        <p className="ml-auto text-xs text-muted-foreground">Payments are handled securely by Stripe.</p>
      </div>
    </Card>
  );
}
