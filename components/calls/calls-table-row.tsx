"use client";

import Link from "next/link";
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
      className="cursor-pointer transition-colors hover:bg-muted/40"
      onClick={() => router.push(`/dashboard/calls/${call.id}`)}
    >
      <TableCell className="whitespace-nowrap align-top text-sm text-muted-foreground">
        {formatDateTimeShort(call.startedAt, timezone)}
      </TableCell>
      <TableCell className="align-top font-medium">
        <Link
          href={`/dashboard/calls/${call.id}`}
          onClick={(e) => e.stopPropagation()}
          className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {call.callerName ?? "Unknown caller"}
        </Link>
      </TableCell>
      <TableCell className="whitespace-nowrap align-top text-sm">
        {call.callerPhone ? (
          <a
            href={`tel:${call.callerPhone}`}
            onClick={(e) => e.stopPropagation()}
            className="tabular text-primary underline-offset-4 hover:underline"
          >
            {call.callerPhone}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="max-w-[12rem] align-top">
        <span className="whitespace-normal break-words text-sm text-muted-foreground">
          {call.issueSummary ?? "—"}
        </span>
      </TableCell>
      <TableCell className="align-top">
        <UrgencyBadge urgency={call.urgencyLevel} />
      </TableCell>
      <TableCell className="align-top">
        <OutcomeBadge outcome={call.outcome} />
      </TableCell>
      <TableCell className="whitespace-nowrap align-top text-sm">
        <CallDuration seconds={call.durationSeconds} />
      </TableCell>
    </TableRow>
  );
}
