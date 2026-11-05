import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomersTableRow } from "@/components/admin/customers-table-row";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/db/schema/customers";

interface Props {
  customers: (Customer & { callsLast7d: number; agencyName: string })[];
  // Platform admins see which agency owns each customer.
  showAgency?: boolean;
}

export function CustomersTable({ customers, showAgency = false }: Props) {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-card px-6 py-16 text-center shadow-card ring-1 ring-foreground/[0.07]">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <UserPlus strokeWidth={1.75} className="size-5" />
        </span>
        <div className="max-w-sm space-y-1">
          <p className="font-medium">No customers yet</p>
          <p className="text-sm text-muted-foreground">
            Set up your first business — the wizard can read their website to fill in most of it.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/customers/new">Add customer</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-foreground/[0.07]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            {showAgency && <TableHead>Agency</TableHead>}
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
            <CustomersTableRow key={c.id} customer={c} showAgency={showAgency} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
