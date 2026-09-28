import Link from "next/link";
import { DateTime } from "luxon";
import { getDashboardStats, getRecentCalls, getOwnerName } from "@/lib/services/dashboard";
import { StatCard } from "@/components/layout/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { OutcomeBadge } from "@/components/calls/outcome-badge";
import { UrgencyBadge } from "@/components/calls/urgency-badge";
import { Card, CardContent } from "@/components/ui/card";
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
      title={`${greeting(timezone)}, ${ownerName ?? "there"}.`}
      description="Here's what's happening with your calls."
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
        <Skeleton key={i} className="h-28 w-full animate-shimmer rounded-lg" />
      ))}
    </div>
  );
}

export async function RecentCalls({ customerId }: { customerId: string }) {
  const recentCalls = await getRecentCalls(customerId, 5);

  if (recentCalls.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No calls yet — your AI agent is ready and waiting. Call your demo number to test it.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {recentCalls.map((call) => (
        <Link key={call.id} href={`/dashboard/calls/${call.id}`} className="block">
          <Card className="cursor-pointer transition-colors hover:bg-accent/30">
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {call.callerName ?? call.callerPhone ?? "Unknown caller"}
                  </p>
                  {call.issueSummary && (
                    <p className="truncate text-sm text-muted-foreground">
                      {call.issueSummary}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <OutcomeBadge outcome={call.outcome} />
                  <UrgencyBadge urgency={call.urgencyLevel} />
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(call.startedAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function RecentCallsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full animate-shimmer rounded-lg" />
      ))}
    </div>
  );
}
