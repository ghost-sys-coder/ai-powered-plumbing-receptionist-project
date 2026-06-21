import { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/require-admin";

const AdminLayout = async ({ children }: { children: ReactNode }) => {
    await requireAdmin();

    return <div>{children}</div>;
};

export default AdminLayout;
