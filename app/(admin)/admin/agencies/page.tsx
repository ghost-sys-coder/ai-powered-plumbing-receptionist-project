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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agency</TableHead>
              <TableHead>Customers</TableHead>
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
                <TableCell>{a.customerCount}</TableCell>
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
