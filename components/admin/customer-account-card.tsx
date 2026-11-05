import { UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DetailList, DetailRow, SectionHeader } from "@/components/layout/section-header";
import type { Customer } from "@/db/schema/customers";
import { InviteButton } from "@/components/admin/invite-button";
import { SetRoleButton } from "@/components/admin/set-role-button";

interface CustomerAccountCardProps {
  customer: Customer;
  hasActiveLogin: boolean;
  linkedUserEmail: string | null;
}

const shortDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function CustomerAccountCard({
  customer,
  hasActiveLogin,
  linkedUserEmail,
}: CustomerAccountCardProps) {
  return (
    <Card className="gap-0 py-0">
      <SectionHeader
        icon={UserRound}
        title="Account"
        description={`Customer since ${shortDate(customer.createdAt)}`}
        className="pt-5"
      />

      <div className="px-5 pt-5">
        <DetailList>
          <DetailRow label="Owner">{customer.ownerName}</DetailRow>
          <DetailRow label="Email">
            <span className="break-all">{customer.email}</span>
          </DetailRow>
          {customer.phone && (
            <DetailRow label="Phone">
              <span className="tabular">{customer.phone}</span>
            </DetailRow>
          )}
          {(customer.city || customer.state) && (
            <DetailRow label="Location">{[customer.city, customer.state].filter(Boolean).join(", ")}</DetailRow>
          )}
          <DetailRow label="Timezone">{customer.timezone}</DetailRow>
          <DetailRow label="Plan">
            <span className="capitalize">{customer.plan}</span>
          </DetailRow>
          {customer.onboardedAt && <DetailRow label="Onboarded">{shortDate(customer.onboardedAt)}</DetailRow>}
          {customer.stripeCustomerId && (
            <DetailRow label="Stripe customer" mono>
              {customer.stripeCustomerId}
            </DetailRow>
          )}
        </DetailList>
      </div>

      {/* Login status + action */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/30 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span
            className={
              hasActiveLogin ? "size-2 shrink-0 rounded-full bg-emerald-500" : "size-2 shrink-0 rounded-full bg-muted-foreground/40"
            }
          />
          {hasActiveLogin ? (
            <span className="min-w-0 truncate">
              <span className="font-medium">Can sign in</span>
              {linkedUserEmail && <span className="text-muted-foreground"> · {linkedUserEmail}</span>}
            </span>
          ) : (
            <span className="font-medium text-muted-foreground">No login yet</span>
          )}
        </div>
        {/* Role fix is for users who signed up before the role was applied. */}
        {hasActiveLogin ? <SetRoleButton customerId={customer.id} /> : <InviteButton customerId={customer.id} />}
      </div>
    </Card>
  );
}
