"use client";

import { useRouter } from "next/navigation";
import { TableRow, TableCell } from "@/components/ui/table";
import { OutcomeBadge } from "@/components/calls/outcome-badge";
import { UrgencyBadge } from "@/components/calls/urgency-badge";
import { CallDuration } from "@/components/calls/call-duration";
import type { Call } from "@/db/schema/calls";
import { formatDateTimeShort } from "@/lib/format-time";

export function CallsTableRow({ call, timezone }: { call: Call; timezone: string }) {
  const router = useRouter();

  return (
    <TableRow
      className="cursor-pointer hover:bg-accent/30"
      onClick={() => router.push(`/dashboard/calls/${call.id}`)}
    >
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatDateTimeShort(call.startedAt, timezone)}
      </TableCell>
      <TableCell className="font-medium">
        {call.callerName ?? call.callerPhone ?? "Unknown"}
      </TableCell>
      <TableCell className="max-w-60">
        <span className="line-clamp-1 text-sm text-muted-foreground">
          {call.issueSummary
            ? call.issueSummary.slice(0, 60) + (call.issueSummary.length > 60 ? "…" : "")
            : "—"}
        </span>
      </TableCell>
      <TableCell>
        <UrgencyBadge urgency={call.urgencyLevel} />
      </TableCell>
      <TableCell>
        <OutcomeBadge outcome={call.outcome} />
      </TableCell>
      <TableCell className="text-sm">
        <CallDuration seconds={call.durationSeconds} />
      </TableCell>
    </TableRow>
  );
}
