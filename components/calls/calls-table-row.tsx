"use client";

import { useRouter } from "next/navigation";
import { TableRow, TableCell } from "@/components/ui/table";
import { OutcomeBadge } from "@/components/calls/outcome-badge";
import { UrgencyBadge } from "@/components/calls/urgency-badge";
import { CallDuration } from "@/components/calls/call-duration";
import type { Call } from "@/db/schema/calls";

function formatCallTime(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function CallsTableRow({ call }: { call: Call }) {
  const router = useRouter();

  return (
    <TableRow
      className="cursor-pointer hover:bg-accent/30"
      onClick={() => router.push(`/dashboard/calls/${call.id}`)}
    >
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatCallTime(call.startedAt)}
      </TableCell>
      <TableCell className="font-medium">
        {call.callerName ?? call.callerPhone ?? "Unknown"}
      </TableCell>
      <TableCell className="max-w-[240px]">
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
