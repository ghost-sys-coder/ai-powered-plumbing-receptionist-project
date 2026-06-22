import * as React from "react";
import { ShieldCheck, Clock, AudioLines } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { LiveCallStrip } from "@/components/auth/live-call-strip";

const proofPoints = [
    { icon: Clock, label: "Answers in under 2 rings", sub: "Day, night, weekends — never sent to voicemail." },
    { icon: AudioLines, label: "Speaks like your shop", sub: "Trained on your pricing, services, and territory." },
    { icon: ShieldCheck, label: "Triages real emergencies", sub: "Books urgent jobs; takes a clean message for the rest." },
];

export function BrandPanel() {
    return (
        <aside className="relative flex h-full flex-col overflow-hidden bg-card text-card-foreground">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-70" />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-brand-radial" />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-noise opacity-[0.04] mix-blend-overlay" />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent"
            />

            <header className="relative z-10 flex items-center justify-between px-10 pt-10">
                <Wordmark />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    For solo plumbers
                </span>
            </header>

            <div className="relative z-10 flex flex-1 flex-col justify-between gap-12 px-10 pt-16 pb-10">
                <div className="max-w-[34ch] space-y-6">
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/50 px-3 py-1 backdrop-blur-sm">
                        <span className="size-1.5 animate-pulse-dot rounded-full bg-brand" />
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.20em] text-muted-foreground">
                            Now answering · 142 shops
                        </span>
                    </span>
                    <h1 className="font-heading text-[44px] leading-[1.02] font-semibold tracking-[-0.02em] text-balance text-foreground">
                        The voice that picks up <span className="italic text-brand">when you can&rsquo;t.</span>
                    </h1>
                    <p className="max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
                        PlumberAnswered answers every call, triages the emergency,
                        quotes the ballpark, and books the slot — so a single
                        plumber runs a shop that feels like a five-person dispatch.
                    </p>
                </div>

                <LiveCallStrip />

                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {proofPoints.map(({ icon: Icon, label, sub }) => (
                        <li
                            key={label}
                            className="rounded-xl border border-border/60 bg-background/40 px-4 py-3.5 backdrop-blur-sm"
                        >
                            <div className="mb-2 inline-flex size-7 items-center justify-center rounded-md bg-brand/12 text-brand">
                                <Icon aria-hidden className="size-3.5" />
                            </div>
                            <p className="text-[13px] font-medium text-foreground">{label}</p>
                            <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                                {sub}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>

            <footer className="relative z-10 flex items-center justify-between border-t border-border/60 bg-background/30 px-10 py-5 backdrop-blur-sm">
                <p className="max-w-[36ch] text-[12.5px] leading-snug text-muted-foreground">
                    <span className="font-medium text-foreground">&ldquo;Booked four jobs my first weekend, while I slept.&rdquo;</span>{" "}
                    Marcus R. · Sole-owner, Sacramento
                </p>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Built by VeilCode
                </span>
            </footer>
        </aside>
    );
}
