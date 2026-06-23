import { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminNav } from "@/components/layout/admin-nav";

const AdminLayout = async ({ children }: { children: ReactNode }) => {
  await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <div className="sticky top-0 h-screen shrink-0 self-start">
        <AdminNav />
      </div>
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
