import Link from "next/link";
import { DateTime } from "luxon";
import { getDashboardStats, getRecentCalls, getOwnerName } from "@/lib/services/dashboard";
import { StatCard } from "@/components/layout/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { OutcomeBadge } from "@/components/calls/outcome-badge";
import { UrgencyBadge } from "@/components/calls/urgency-badge";
import { Card } from "@/components/ui/card";
import { PhoneIncoming } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Each section fetches its own data so the dashboard streams in piece by
// piece, and a failure in one (wrapped in SectionErrorBoundary) leaves the
// others intact.

type SectionProps = { customerId: string; timezone: string };

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "#";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function greeting(timezone: string): string {
  const now = DateTime.now().setZone(timezone);
  const h = now.isValid ? now.hour : new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export async function DashboardGreeting({ customerId, timezone }: SectionProps) {
  // The name is decorative — fall back to a generic greeting rather than fail.
  const ownerName = await getOwnerName(customerId).catch(() => null);

  return (
    <PageHeader
      eyebrow="Overview"
      title={`${greeting(timezone)}, ${ownerName ?? "there"}.`}
      description="Here's what your receptionist has handled lately."
    />
  );
}

export function DashboardGreetingSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-64 animate-shimmer" />
      <Skeleton className="mt-2 h-4 w-80 animate-shimmer" />
    </div>
  );
}

export async function DashboardStats({ customerId, timezone }: SectionProps) {
  const stats = await getDashboardStats(customerId, timezone);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Calls today" value={stats.callsToday} />
      <StatCard label="Calls this week" value={stats.callsThisWeek} />
      <StatCard label="Booked this week" value={stats.bookedThisWeek} />
      <StatCard label="Missed this week" value={stats.missedThisWeek} />
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[108px] w-full animate-shimmer rounded-2xl" />
      ))}
    </div>
  );
}

export async function RecentCalls({ customerId }: { customerId: string }) {
  const recentCalls = await getRecentCalls(customerId, 5);

  if (recentCalls.length === 0) {
    return (
      <Card className="items-center px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <PhoneIncoming strokeWidth={1.75} className="size-5" />
        </span>
        <div className="max-w-sm space-y-1">
          <p className="font-medium">No calls yet</p>
          <p className="text-sm text-muted-foreground">
            Your receptionist is live and waiting. Call your number to hear it — the call will show up here
            a moment after you hang up.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-1.5">
      <ul className="divide-y divide-border/70">
        {recentCalls.map((call) => {
          const who = call.callerName ?? call.callerPhone ?? "Unknown caller";
          return (
            <li key={call.id}>
              <Link
                href={`/dashboard/calls/${call.id}`}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-[0.8125rem] font-semibold text-muted-foreground ring-1 ring-inset ring-foreground/[0.05]">
                  {initials(call.callerName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{who}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {call.issueSummary ?? "No summary"}
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                  <OutcomeBadge outcome={call.outcome} />
                  <UrgencyBadge urgency={call.urgencyLevel} />
                </div>
                <span className="tabular w-16 shrink-0 text-right text-xs text-muted-foreground">
                  {timeAgo(call.startedAt)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function RecentCallsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[68px] w-full animate-shimmer rounded-xl" />
      ))}
    </div>
  );
}
