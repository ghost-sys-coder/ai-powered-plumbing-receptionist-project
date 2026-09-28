import * as React from "react";

type PortalShellProps = {
    title: string;
    subtitle: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
};

// Minimal, distraction-free frame shared by every auth screen: one heading,
// the Clerk form, and a single line of help text. No nav, no marketing.
export function PortalShell({ title, subtitle, children, footer }: PortalShellProps) {
    return (
        <div className="relative flex min-h-screen flex-col bg-background text-foreground">
            {/* single soft glow — the only decoration on the page */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,var(--brand-glow),transparent)]"
            />

            <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-16">
                <div className="w-full max-w-[380px] animate-fade-up">
                    <div className="mb-8 text-center">
                        <h1 className="font-heading text-[28px] leading-tight font-semibold tracking-[-0.02em]">
                            {title}
                        </h1>
                        <p className="mt-2 text-[14px] text-muted-foreground">{subtitle}</p>
                    </div>

                    {children}

                    {footer && (
                        <p className="mt-8 text-center text-[13px] text-muted-foreground">{footer}</p>
                    )}
                </div>
            </main>

            <footer className="relative z-10 px-6 pb-6 text-center">
                <span className="text-[12px] text-muted-foreground/70">
                    Access is by invitation only · Need help? Contact your account manager.
                </span>
            </footer>
        </div>
    );
}
