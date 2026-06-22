import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type WordmarkProps = {
    href?: string;
    className?: string;
    showMark?: boolean;
};

export function Wordmark({ href = "/", className, showMark = true }: WordmarkProps) {
    const content = (
        <span className={cn("inline-flex items-center gap-2.5", className)}>
            {showMark && (
                <span
                    aria-hidden
                    className="relative grid size-8 place-items-center rounded-md bg-brand text-brand-foreground shadow-[0_1px_0_color-mix(in_oklch,var(--foreground)_15%,transparent),inset_0_1px_0_color-mix(in_oklch,white_25%,transparent)]"
                >
                    <span className="font-mono text-[13px] font-semibold tracking-tight">PV</span>
                </span>
            )}
            <span className="flex items-baseline gap-1.5">
                <span className="text-[17px] font-semibold tracking-tight text-foreground">
                    PlumbVoice
                </span>
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 sm:inline">
                    /ai-line
                </span>
            </span>
        </span>
    );

    return href ? (
        <Link href={href} className="group inline-flex">
            {content}
        </Link>
    ) : (
        content
    );
}
