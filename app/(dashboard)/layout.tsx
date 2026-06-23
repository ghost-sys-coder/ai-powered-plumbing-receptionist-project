import { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { users, vapiAgents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ClientNav } from "@/components/layout/client-nav";

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select({ customerId: users.customerId })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  let businessName: string | undefined;
  if (user?.customerId) {
    const [agent] = await db
      .select({ ownerName: vapiAgents.ownerName })
      .from(vapiAgents)
      .where(eq(vapiAgents.customerId, user.customerId))
      .limit(1);
    businessName = agent?.ownerName ?? undefined;
  }

  return (
    <div className="flex min-h-screen">
      <div className="sticky top-0 h-screen shrink-0 self-start">
        <ClientNav businessName={businessName} />
      </div>
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
