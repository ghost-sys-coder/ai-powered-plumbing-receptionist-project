import * as React from "react";

import { BrandPanel } from "@/components/auth/brand-panel";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type AuthShellProps = {
    eyebrow: string;
    title: string;
    subtitle: React.ReactNode;
    children: React.ReactNode;
    footer: React.ReactNode;
};

export function AuthShell({ eyebrow, title, subtitle, children, footer }: AuthShellProps) {
    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[1.05fr_1fr]">
            <div className="hidden lg:block">
                <BrandPanel />
            </div>

            <main className="relative flex min-h-screen flex-col">
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-40 lg:hidden" />

                <header className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-10 lg:justify-end">
                    <div className="lg:hidden">
                        <Wordmark />
                    </div>
                    <ThemeToggle />
                </header>

                <section className="relative z-10 flex flex-1 justify-center px-6 pb-10 sm:px-10">
                    <div className="w-full max-w-[420px] animate-fade-up">
                        <div className="mb-6 space-y-2">
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
                                {eyebrow}
                            </span>
                            <h2 className="font-heading text-[26px] leading-tight font-semibold tracking-[-0.01em] text-foreground">
                                {title}
                            </h2>
                            <p className="text-[13.5px] leading-relaxed text-muted-foreground text-balance">
                                {subtitle}
                            </p>
                        </div>

                        {children}

                        <p className="mt-6 text-center text-[13px] text-muted-foreground">
                            {footer}
                        </p>
                    </div>
                </section>

                <footer className="relative z-10 flex flex-col items-center gap-1 px-6 pb-6 text-center sm:flex-row sm:justify-between sm:px-10">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        SOC 2-ready · HIPAA-aware
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        © 2026 PlumberAnswered
                    </span>
                </footer>
            </main>
        </div>
    );
}
