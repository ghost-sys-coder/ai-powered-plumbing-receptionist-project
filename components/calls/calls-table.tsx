import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PhoneIncoming } from "lucide-react";
import { CallsTableRow } from "@/components/calls/calls-table-row";
import type { Call } from "@/db/schema/calls";

export function CallsTable({ calls, timezone }: { calls: Call[]; timezone: string }) {
  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-16 text-center shadow-card ring-1 ring-foreground/[0.07]">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <PhoneIncoming strokeWidth={1.75} className="size-5" />
        </span>
        <p className="font-medium">No calls here</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Nothing matches these filters yet. Try a wider date range, or clear the filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-foreground/[0.07]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Caller</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => (
            <CallsTableRow key={call.id} call={call} timezone={timezone} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
