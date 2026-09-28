import { Suspense } from "react";
import Link from "next/link";
import { getCustomerContext } from "@/lib/auth/get-customer-id";
import { SectionErrorBoundary } from "@/components/layout/section-error-boundary";
import {
  DashboardGreeting,
  DashboardGreetingSkeleton,
  DashboardStats,
  DashboardStatsSkeleton,
  RecentCalls,
  RecentCallsSkeleton,
} from "@/components/dashboard/dashboard-sections";

const DashboardPage = async () => {
  const ctx = await getCustomerContext();

  if (!ctx) {
    return (
      <div className="animate-fade-in flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-xl font-semibold">Account not linked</h1>
        <p className="max-w-sm text-muted-foreground">
          Your login isn&apos;t connected to a plumbing business account yet.
          Contact your PlumberAnswered manager to get set up.
        </p>
      </div>
    );
  }

  const { customerId, timezone } = ctx;

  return (
    <div className="animate-fade-in space-y-8">
      <Suspense fallback={<DashboardGreetingSkeleton />}>
        <DashboardGreeting customerId={customerId} timezone={timezone} />
      </Suspense>

      <SectionErrorBoundary message="We couldn't load your call stats.">
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStats customerId={customerId} timezone={timezone} />
        </Suspense>
      </SectionErrorBoundary>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent calls</h2>
          <Link
            href="/dashboard/calls"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            View all calls →
          </Link>
        </div>

        <SectionErrorBoundary message="We couldn't load your recent calls.">
          <Suspense fallback={<RecentCallsSkeleton />}>
            <RecentCalls customerId={customerId} />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  );
};

export default DashboardPage;
