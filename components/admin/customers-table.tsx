import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomersTableRow } from "@/components/admin/customers-table-row";
import type { Customer } from "@/db/schema/customers";

interface Props {
  customers: (Customer & { callsLast7d: number })[];
}

export function CustomersTable({ customers }: Props) {
  if (customers.length === 0) {
    return (
      <div className="rounded-lg border py-16 text-center">
        <p className="text-muted-foreground">
          No customers yet. Add your first customer to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead>Calls (7d)</TableHead>
            <TableHead>Since</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => (
            <CustomersTableRow key={c.id} customer={c} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
