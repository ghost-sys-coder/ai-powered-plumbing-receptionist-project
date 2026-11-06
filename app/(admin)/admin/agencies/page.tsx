import { requirePlatformAdmin } from "@/lib/auth/staff";
import { listAgencies } from "@/lib/services/agencies";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateAgencyForm } from "@/components/admin/create-agency-form";
import { InviteAgencyMember } from "@/components/admin/invite-agency-member";

// Platform-only: the agencies that resell receptionists, plus the house agency
// that holds businesses buying directly.
const AgenciesPage = async () => {
  await requirePlatformAdmin();
  const agencies = await listAgencies();

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Agencies"
        description="Agencies resell AI receptionists to their clients. Their staff see only their own customers."
      />

      <Card>
        <CardContent className="pt-6">
          <CreateAgencyForm />
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-foreground/[0.07]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agency</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Clients</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead className="w-80">Invite staff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agencies.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  <span className="mr-2">{a.name}</span>
                  {a.isHouse && <Badge variant="secondary">Direct</Badge>}
                </TableCell>
                <TableCell className="text-sm">
                  {a.isHouse ? (
                    <span className="text-muted-foreground">Billed per customer</span>
                  ) : a.plan?.planName ? (
                    a.plan.planName
                  ) : (
                    <span className="text-muted-foreground">No subscription</span>
                  )}
                </TableCell>
                <TableCell className="tabular">
                  {a.customerCount}
                  {a.plan?.limit != null && (
                    <span
                      className={
                        a.customerCount >= a.plan.limit
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-muted-foreground"
                      }
                    >
                      {" "}
                      / {a.plan.limit}
                    </span>
                  )}
                </TableCell>
                <TableCell>{a.memberCount}</TableCell>
                <TableCell>
                  {a.isHouse ? (
                    <span className="text-xs text-muted-foreground">
                      Managed by platform admins
                    </span>
                  ) : (
                    <InviteAgencyMember agencyId={a.id} agencyName={a.name} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AgenciesPage;
