"use client";

import * as React from "react";
import { SignUp } from "@clerk/nextjs";
import { useTheme } from "next-themes";

import { clerkAppearance } from "@/components/auth/clerk-appearance";

export function ThemedSignUp() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    const isDark = mounted ? resolvedTheme === "dark" : true;

    return (
        <SignUp
            key={isDark ? "dark" : "light"}
            appearance={clerkAppearance(isDark)}
            signInUrl="/sign-in"
        />
    );
}
