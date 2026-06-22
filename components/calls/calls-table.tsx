import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CallsTableRow } from "@/components/calls/calls-table-row";
import type { Call } from "@/db/schema/calls";

export function CallsTable({ calls }: { calls: Call[] }) {
  if (calls.length === 0) {
    return (
      <div className="rounded-lg border py-16 text-center">
        <p className="text-muted-foreground">No calls match this filter.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Caller</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => (
            <CallsTableRow key={call.id} call={call} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
