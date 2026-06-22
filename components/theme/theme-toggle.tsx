"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    const isDark = mounted && resolvedTheme === "dark";

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative size-9 rounded-full border border-border/60 bg-background/60 backdrop-blur-sm transition-all hover:border-border hover:bg-muted"
        >
            <Sun
                aria-hidden
                className="size-4 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0"
            />
            <Moon
                aria-hidden
                className="absolute size-4 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100"
            />
        </Button>
    );
}
