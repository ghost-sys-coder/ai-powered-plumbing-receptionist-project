import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OutcomeBadge } from "@/components/calls/outcome-badge";
import { UrgencyBadge } from "@/components/calls/urgency-badge";
import { CallDuration } from "@/components/calls/call-duration";
import type { Call } from "@/db/schema/calls";
import { formatDateTimeFull } from "@/lib/format-time";
import { getIndustry } from "@/lib/verticals";

// Industry-specific fields in display order: the profile's declared fields
// first, then any stored keys it no longer declares (e.g. after the business
// changed industry), labelled from the key.
function intakeRows(
  data: Record<string, string> | null,
  fields: ReadonlyArray<{ key: string; label: string }>
): Array<{ key: string; label: string; value: string }> {
  if (!data) return [];
  const known = fields
    .filter((f) => data[f.key])
    .map((f) => ({ key: f.key, label: f.label, value: data[f.key] }));
  const declared = new Set(fields.map((f) => f.key));
  const extra = Object.entries(data)
    .filter(([key, value]) => !declared.has(key) && value)
    .map(([key, value]) => ({
      key,
      label: key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
      value,
    }));
  return [...known, ...extra];
}

export function CallSummaryCard({
  call,
  timezone,
  industry,
}: {
  call: Call;
  timezone: string;
  industry?: string;
}) {
  const profile = getIndustry(industry);
  const rows = intakeRows(call.intakeData, profile.intakeFields);
  // Show "Not provided" only where an address is expected for the industry.
  const showAddress = profile.collectsServiceAddress || !!call.serviceAddress;

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
            <dd className="text-right font-medium">{call.callerName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Callback number</dt>
            <dd className="text-right font-medium">
              {call.callerPhone ? (
                <a href={`tel:${call.callerPhone}`} className="hover:underline">
                  {call.callerPhone}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          {call.issueSummary && (
            <div>
              <dt className="mb-1 text-muted-foreground">Issue</dt>
              <dd className="font-medium">{call.issueSummary}</dd>
            </div>
          )}
          {showAddress && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="text-right font-medium">
                {call.serviceAddress ?? "Not provided"}
              </dd>
            </div>
          )}
          {rows.map((row) => (
            <div key={row.key} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="text-right font-medium">{row.value}</dd>
            </div>
          ))}
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
