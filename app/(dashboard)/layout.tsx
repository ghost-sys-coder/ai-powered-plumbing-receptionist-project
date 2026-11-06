import { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { customers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ClientNav } from "@/components/layout/client-nav";
import { getStaffViewer } from "@/lib/auth/staff";

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // The client dashboard is for business owners. Platform admins and agency
  // staff work from the admin console (they see a business's calls on its
  // customer page there).
  if (await getStaffViewer()) redirect("/admin");

  const [user] = await db
    .select({ customerId: users.customerId })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  let businessName: string | undefined;
  if (user?.customerId) {
    const [customer] = await db
      .select({ businessName: customers.businessName })
      .from(customers)
      .where(eq(customers.id, user.customerId))
      .limit(1);
    businessName = customer?.businessName ?? undefined;
  }

  return (
    <div className="flex min-h-dvh">
      <div className="sticky top-0 h-screen shrink-0 self-start">
        <ClientNav businessName={businessName} />
      </div>
      <main id="main" className="app-canvas min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
