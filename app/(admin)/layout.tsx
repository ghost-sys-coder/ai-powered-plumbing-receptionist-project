import { ReactNode } from "react";
import { requireStaff } from "@/lib/auth/staff";
import { getAgency } from "@/lib/services/agencies";
import { AdminNav } from "@/components/layout/admin-nav";

const AdminLayout = async ({ children }: { children: ReactNode }) => {
  const viewer = await requireStaff();
  const agency = viewer.kind === "agency" ? await getAgency(viewer.organizationId) : null;

  return (
    <div className="flex min-h-screen">
      <div className="sticky top-0 h-screen shrink-0 self-start">
        <AdminNav
          isPlatform={viewer.kind === "platform"}
          subtitle={agency?.name ?? "Platform admin"}
        />
      </div>
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
