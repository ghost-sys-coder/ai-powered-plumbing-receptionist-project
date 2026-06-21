import { requireAdmin } from "@/lib/auth/require-admin";

const AdminPage = async () => {
    await requireAdmin();

    return <div>page</div>;
};

export default AdminPage;
