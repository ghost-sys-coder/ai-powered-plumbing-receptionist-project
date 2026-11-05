import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DetailList, DetailRow, SectionHeader } from "@/components/layout/section-header";
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
      <SectionHeader icon={FileText} title="Call summary" />
      <div className="space-y-4 px-5">
        {call.issueSummary && (
          <p className="rounded-xl bg-muted/50 px-3.5 py-3 leading-relaxed ring-1 ring-inset ring-foreground/[0.05]">
            {call.issueSummary}
          </p>
        )}
        <DetailList>
          <DetailRow label="Caller">{call.callerName ?? "—"}</DetailRow>
          <DetailRow label="Callback number">
            {call.callerPhone ? (
              <a href={`tel:${call.callerPhone}`} className="tabular text-primary underline-offset-4 hover:underline">
                {call.callerPhone}
              </a>
            ) : (
              "—"
            )}
          </DetailRow>
          {showAddress && (
            <DetailRow label="Address">
              {call.serviceAddress ?? <span className="font-normal text-muted-foreground">Not provided</span>}
            </DetailRow>
          )}
          {rows.map((row) => (
            <DetailRow key={row.key} label={row.label}>
              {row.value}
            </DetailRow>
          ))}
          <DetailRow label="Duration">
            <CallDuration seconds={call.durationSeconds} />
          </DetailRow>
          <DetailRow label="Time" stacked>
            {formatDateTimeFull(call.startedAt, timezone)}
          </DetailRow>
        </DetailList>
      </div>
    </Card>
  );
}
