import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/auth/portal-shell";
import { ThemedSignIn } from "@/components/auth/themed-sign-in";
import { homeForRole, roleFromClaims } from "@/lib/auth/staff";

export const metadata: Metadata = {
    title: "Sign in — Client portal",
    description: "Sign in to view your calls, bookings, and AI receptionist.",
    robots: { index: false },
};

const PortalPage = async () => {
    const { userId, sessionClaims } = await auth();

    // Signed-in users skip the portal and go straight to their workspace:
    // platform admins and agency staff to /admin, clients to /dashboard.
    if (userId) {
        redirect(homeForRole(roleFromClaims(sessionClaims)));
    }

    return (
        <PortalShell title="Welcome back" subtitle="Sign in to your client portal.">
            <ThemedSignIn hashRouting fallbackRedirectUrl="/v2" />
        </PortalShell>
    );
};

export default PortalPage;
