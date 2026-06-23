import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Customer } from "@/db/schema/customers";
import { InviteButton } from "@/components/admin/invite-button";

interface CustomerAccountCardProps {
  customer: Customer;
  hasActiveLogin: boolean;
  linkedUserEmail: string | null;
}

export function CustomerAccountCard({
  customer,
  hasActiveLogin,
  linkedUserEmail,
}: CustomerAccountCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Account info</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="font-medium">{customer.ownerName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium break-all">{customer.email}</dd>
          </div>
          {customer.phone && (
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{customer.phone}</dd>
            </div>
          )}
          {(customer.city || customer.state) && (
            <div>
              <dt className="text-muted-foreground">Location</dt>
              <dd className="font-medium">
                {[customer.city, customer.state].filter(Boolean).join(", ")}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Timezone</dt>
            <dd className="font-medium">{customer.timezone}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium capitalize">{customer.plan}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Subscription</dt>
            <dd className="font-medium capitalize">
              {customer.subscriptionStatus.replace("_", " ")}
            </dd>
          </div>
          {customer.stripeCustomerId && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Stripe ID</dt>
              <dd className="font-mono text-xs">{customer.stripeCustomerId}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="font-medium">
              {customer.createdAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </dd>
          </div>
          {customer.onboardedAt && (
            <div>
              <dt className="text-muted-foreground">Onboarded</dt>
              <dd className="font-medium">
                {customer.onboardedAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </dd>
            </div>
          )}

          {/* Login status */}
          <div className="col-span-2">
            <dt className="text-muted-foreground">Login status</dt>
            <dd className="mt-1 flex items-center gap-2">
              {hasActiveLogin ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    Login active
                  </span>
                  {linkedUserEmail && (
                    <span className="text-muted-foreground">— {linkedUserEmail}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span className="font-medium">No login yet</span>
                </>
              )}
            </dd>
          </div>

          {/* Invite action */}
          {!hasActiveLogin && (
            <div className="col-span-2 pt-1">
              <InviteButton customerId={customer.id} />
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
