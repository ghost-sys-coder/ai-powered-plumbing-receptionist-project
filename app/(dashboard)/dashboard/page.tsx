import Link from "next/link";
import { getCustomerId } from "@/lib/auth/get-customer-id";
import { getDashboardStats, getRecentCalls, getAgentConfig } from "@/lib/services/dashboard";
import { StatCard } from "@/components/layout/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { OutcomeBadge } from "@/components/calls/outcome-badge";
import { UrgencyBadge } from "@/components/calls/urgency-badge";
import { Card, CardContent } from "@/components/ui/card";

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const DashboardPage = async () => {
  const customerId = await getCustomerId();

  if (!customerId) {
    return (
      <div className="animate-fade-in flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-xl font-semibold">Account not linked</h1>
        <p className="max-w-sm text-muted-foreground">
          Your login isn&apos;t connected to a plumbing business account yet.
          Contact your PlumberAnswered manager to get set up.
        </p>
      </div>
    );
  }

  const [stats, recentCalls, agent] = await Promise.all([
    getDashboardStats(customerId),
    getRecentCalls(customerId, 5),
    getAgentConfig(customerId),
  ]);

  const name = agent?.ownerName ?? "there";

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title={`${greeting()}, ${name}.`}
        description="Here's what's happening with your calls."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Calls today" value={stats.callsToday} />
        <StatCard label="Calls this week" value={stats.callsThisWeek} />
        <StatCard label="Booked this week" value={stats.bookedThisWeek} />
        <StatCard label="Missed this week" value={stats.missedThisWeek} />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent calls</h2>
          <Link
            href="/dashboard/calls"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            View all calls →
          </Link>
        </div>

        {recentCalls.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No calls yet — your AI agent is ready and waiting. Call your demo number to test it.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentCalls.map((call) => (
              <Link key={call.id} href={`/dashboard/calls/${call.id}`}>
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
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
