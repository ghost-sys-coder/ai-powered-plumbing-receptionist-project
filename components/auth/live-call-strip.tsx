import * as React from "react";
import { PhoneIncoming } from "lucide-react";

import { cn } from "@/lib/utils";

type LiveCallStripProps = {
    className?: string;
};

const transcript = [
    { who: "Caller", line: "Hi — my kitchen sink is leaking under the cabinet, water everywhere." },
    { who: "PlumbVoice", line: "I'm sorry to hear that. Have you been able to shut off the valve below the sink?" },
    { who: "Caller", line: "Yes, just did. It slowed down a lot." },
    { who: "PlumbVoice", line: "Good — that's an emergency for us. Mike can be there by 4:15 today. Address okay to confirm?" },
];

const WAVE_BARS = 18;

export function LiveCallStrip({ className }: LiveCallStripProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md",
                "shadow-[0_24px_60px_-30px_color-mix(in_oklch,var(--brand)_45%,transparent)]",
                className
            )}
        >
            <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-background/40 px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <span className="relative grid size-7 place-items-center rounded-full bg-brand/15 text-brand">
                        <PhoneIncoming aria-hidden className="size-3.5" />
                        <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-full bg-brand/30" />
                    </span>
                    <div className="flex flex-col">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            Live · Inbound
                        </span>
                        <span className="text-[13px] font-medium text-foreground">
                            +1 (415) 555-0418
                        </span>
                    </div>
                </div>
                <div className="flex items-end gap-[3px] pr-1">
                    {Array.from({ length: WAVE_BARS }).map((_, i) => (
                        <span
                            key={i}
                            className="w-[3px] rounded-full bg-brand/80 animate-wave-bar"
                            style={{
                                height: `${10 + ((i * 37) % 14)}px`,
                                animationDelay: `${(i % 6) * 90}ms`,
                            }}
                        />
                    ))}
                </div>
            </div>

            <ol className="divide-y divide-border/40">
                {transcript.map((t, i) => (
                    <li
                        key={i}
                        className="grid grid-cols-[88px_1fr] items-start gap-3 px-4 py-3 animate-fade-up"
                        style={{ animationDelay: `${i * 120}ms` }}
                    >
                        <span
                            className={cn(
                                "font-mono text-[10px] uppercase tracking-[0.18em] pt-0.5",
                                t.who === "PlumbVoice"
                                    ? "text-brand"
                                    : "text-muted-foreground"
                            )}
                        >
                            {t.who}
                        </span>
                        <span className="text-[13px] leading-relaxed text-foreground/90 text-balance">
                            {t.line}
                        </span>
                    </li>
                ))}
            </ol>

            <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-background/40 px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <span className="size-1.5 animate-pulse-dot rounded-full bg-emerald-500" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        Booking · 4:15 PM today
                    </span>
                </div>
                <span className="font-mono text-[10px] tracking-tight text-muted-foreground/80">
                    01:42 · transcribed
                </span>
            </div>
        </div>
    );
}
