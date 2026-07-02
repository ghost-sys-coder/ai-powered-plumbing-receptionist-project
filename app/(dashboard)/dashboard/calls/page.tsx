import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCustomerContext } from "@/lib/auth/get-customer-id";
import { getCallsPage } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { CallsTable } from "@/components/calls/calls-table";
import { CallsFilterBar } from "@/components/calls/calls-filter-bar";

interface Props {
  searchParams: Promise<{
    outcome?: string;
    urgency?: string;
    dateRange?: string;
    page?: string;
  }>;
}

const CallsPage = async ({ searchParams }: Props) => {
  const params = await searchParams;
  const ctx = await getCustomerContext();
  if (!ctx) redirect("/dashboard");
  const { customerId, timezone } = ctx;

  const { calls, total, page, pageCount } = await getCallsPage(customerId, {
    outcome: params.outcome,
    urgency: params.urgency,
    dateRange: params.dateRange,
    page: params.page ? parseInt(params.page) : 1,
  });

  const buildPageUrl = (p: number) => {
    const q = new URLSearchParams();
    if (params.outcome) q.set("outcome", params.outcome);
    if (params.urgency) q.set("urgency", params.urgency);
    if (params.dateRange) q.set("dateRange", params.dateRange);
    q.set("page", String(p));
    return `?${q.toString()}`;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Calls" description={`${total} total`} />

      <Suspense>
        <CallsFilterBar />
      </Suspense>

      <CallsTable calls={calls} timezone={timezone} />

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildPageUrl(page - 1)}
                className="rounded border px-3 py-1 hover:bg-accent"
              >
                Previous
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={buildPageUrl(page + 1)}
                className="rounded border px-3 py-1 hover:bg-accent"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CallsPage;
