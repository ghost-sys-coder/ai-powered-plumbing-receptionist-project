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
      <PageHeader
        eyebrow="Calls"
        title="Every call, in one place"
        description={`${total.toLocaleString()} ${total === 1 ? "call" : "calls"}${
          params.outcome || params.urgency || params.dateRange ? " match these filters" : " answered so far"
        }. Open one for the recording, transcript and summary.`}
      />

      <Suspense>
        <CallsFilterBar />
      </Suspense>

      <CallsTable calls={calls} timezone={timezone} />

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page <span className="tabular font-medium text-foreground">{page}</span> of {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildPageUrl(page - 1)}
                className="inline-flex h-8 items-center rounded-lg bg-card px-3 font-medium text-foreground shadow-xs-tinted ring-1 ring-foreground/10 transition-colors hover:bg-muted/50"
              >
                Previous
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={buildPageUrl(page + 1)}
                className="inline-flex h-8 items-center rounded-lg bg-card px-3 font-medium text-foreground shadow-xs-tinted ring-1 ring-foreground/10 transition-colors hover:bg-muted/50"
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
