import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { homeForRole, roleFromClaims } from "@/lib/auth/staff";

const AuthLayout = async ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, sessionClaims } = await auth();

    // Already signed in: go to your own home (staff to /admin, owners to /dashboard).
    if (isAuthenticated) redirect(homeForRole(roleFromClaims(sessionClaims)));

    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
};

export default AuthLayout;
