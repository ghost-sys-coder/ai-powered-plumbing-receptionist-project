import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OutcomeBadge } from "@/components/calls/outcome-badge";
import { UrgencyBadge } from "@/components/calls/urgency-badge";
import { CallDuration } from "@/components/calls/call-duration";
import type { Call } from "@/db/schema/calls";
import { formatDateTimeFull } from "@/lib/format-time";

export function CallSummaryCard({ call, timezone }: { call: Call; timezone: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Call summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <OutcomeBadge outcome={call.outcome} />
          <UrgencyBadge urgency={call.urgencyLevel} />
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Caller</dt>
            <dd className="text-right font-medium">
              {call.callerName ?? "—"}
              {call.callerPhone ? ` · ${call.callerPhone}` : ""}
            </dd>
          </div>
          {call.issueSummary && (
            <div>
              <dt className="mb-1 text-muted-foreground">Issue</dt>
              <dd className="font-medium">{call.issueSummary}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Address</dt>
            <dd className="text-right font-medium">
              {call.serviceAddress ?? "Not provided"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Duration</dt>
            <dd>
              <CallDuration seconds={call.durationSeconds} />
            </dd>
          </div>
          <div>
            <dt className="mb-0.5 text-muted-foreground">Time</dt>
            <dd className="font-medium">{formatDateTimeFull(call.startedAt, timezone)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
