"use client";

import { useRouter } from "next/navigation";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Customer } from "@/db/schema/customers";

const statusConfig: Record<string, { label: string; className: string }> = {
  onboarding: {
    label: "Onboarding",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  active: {
    label: "Active",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  },
  paused: {
    label: "Paused",
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  },
  churned: {
    label: "Churned",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  },
};

const subStatusClass: Record<string, string> = {
  trialing: "bg-slate-100 text-slate-500 border-slate-200",
  active: "bg-green-100 text-green-700 border-green-200",
  past_due: "bg-red-100 text-red-600 border-red-200",
  canceled: "bg-slate-100 text-slate-400 border-slate-200",
  paused: "bg-amber-100 text-amber-600 border-amber-200",
};

interface Props {
  customer: Customer & { callsLast7d: number };
}

export function CustomersTableRow({ customer }: Props) {
  const router = useRouter();
  const status = statusConfig[customer.status];

  return (
    <TableRow
      className="cursor-pointer hover:bg-accent/30"
      onClick={() => router.push(`/admin/customers/${customer.id}`)}
    >
      <TableCell className="font-medium">{customer.businessName}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {customer.ownerName}
      </TableCell>
      <TableCell>
        {status && (
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-sm capitalize">{customer.plan}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`text-xs ${subStatusClass[customer.subscriptionStatus] ?? ""}`}
        >
          {customer.subscriptionStatus.replace("_", " ")}
        </Badge>
      </TableCell>
      <TableCell className="text-sm font-medium">{customer.callsLast7d}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {customer.createdAt.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })}
      </TableCell>
    </TableRow>
  );
}
