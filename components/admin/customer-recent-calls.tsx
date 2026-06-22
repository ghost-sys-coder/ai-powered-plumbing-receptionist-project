import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OutcomeBadge } from "@/components/calls/outcome-badge";
import { UrgencyBadge } from "@/components/calls/urgency-badge";
import type { Call } from "@/db/schema/calls";

export function CustomerRecentCalls({
  calls,
}: {
  calls: Call[];
  customerId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent calls</CardTitle>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No calls yet.</p>
        ) : (
          <div className="divide-y">
            {calls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {call.callerName ?? call.callerPhone ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {call.startedAt.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <OutcomeBadge outcome={call.outcome} />
                  <UrgencyBadge urgency={call.urgencyLevel} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
