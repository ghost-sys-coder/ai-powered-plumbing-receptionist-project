import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/auth/portal-shell";
import { ThemedSignIn } from "@/components/auth/themed-sign-in";

export const metadata: Metadata = {
    title: "Sign in — Client portal",
    description: "Sign in to view your calls, bookings, and AI receptionist.",
    robots: { index: false },
};

type RoleClaims = { role?: "admin" | "client" } | undefined;

const PortalPage = async () => {
    const { userId, sessionClaims } = await auth();

    // Signed-in users skip the portal and go straight to their workspace.
    if (userId) {
        const role = (sessionClaims?.metadata as RoleClaims)?.role;
        redirect(role === "admin" ? "/admin" : "/dashboard");
    }

    return (
        <PortalShell title="Welcome back" subtitle="Sign in to your client portal.">
            <ThemedSignIn hashRouting fallbackRedirectUrl="/v2" />
        </PortalShell>
    );
};

export default PortalPage;
