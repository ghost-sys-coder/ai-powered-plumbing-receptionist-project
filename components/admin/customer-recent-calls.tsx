import { PhoneIncoming } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyNote, SectionHeader } from "@/components/layout/section-header";
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
      <SectionHeader icon={PhoneIncoming} title="Recent calls" description="The latest calls answered" />
      <div className="px-5">
        {calls.length === 0 ? (
          <EmptyNote>No calls yet.</EmptyNote>
        ) : (
          <ul className="divide-y divide-border/60">
            {calls.map((call) => (
              <li key={call.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{call.callerName ?? call.callerPhone ?? "Unknown caller"}</p>
                  <p className="tabular text-xs text-muted-foreground">
                    {call.startedAt.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <OutcomeBadge outcome={call.outcome} />
                  <UrgencyBadge urgency={call.urgencyLevel} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
