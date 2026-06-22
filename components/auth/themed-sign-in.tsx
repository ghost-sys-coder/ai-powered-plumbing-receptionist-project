"use client";

import * as React from "react";
import { SignIn } from "@clerk/nextjs";
import { useTheme } from "next-themes";

import { clerkAppearance } from "@/components/auth/clerk-appearance";

export function ThemedSignIn() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    const isDark = mounted ? resolvedTheme === "dark" : true;

    return (
        <SignIn
            key={isDark ? "dark" : "light"}
            appearance={clerkAppearance(isDark)}
            signUpUrl="/sign-up"
        />
    );
}
