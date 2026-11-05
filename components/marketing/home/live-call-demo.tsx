"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BellRing, Bot, CalendarCheck2, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

type Line = { who: "ai" | "caller"; text: string };
type Scenario = {
  tab: string;
  business: string;
  caller: string;
  lines: Line[];
  badges: Array<{ label: string; tone: "good" | "bad" | "warn" | "brand" }>;
  result: { icon: "booked" | "alert" | "message"; title: string; detail: string };
};

// Each scenario only shows things the product really does.
const SCENARIOS: Scenario[] = [
  {
    tab: "Dental",
    business: "Harbourside Dental",
    caller: "Marcus W.",
    lines: [
      { who: "ai", text: "Thanks for calling Harbourside Dental. How can I help?" },
      { who: "caller", text: "I chipped a front tooth at football. Can someone see me this week?" },
      { who: "ai", text: "Sorry to hear that. I have Thursday at 10:30 or 2:15 with Dr. Raman. Which suits you?" },
      { who: "caller", text: "10:30, please." },
    ],
    badges: [
      { label: "Booked", tone: "good" },
      { label: "Urgent", tone: "warn" },
    ],
    result: { icon: "booked", title: "Appointment booked", detail: "Thu 10:30 AM · added to Google Calendar" },
  },
  {
    tab: "Plumbing",
    business: "Hightower Plumbing",
    caller: "+1 512 ••• 0918",
    lines: [
      { who: "ai", text: "Thank you for calling Hightower Plumbing. How can I help?" },
      { who: "caller", text: "A pipe just burst under my kitchen sink. There's water everywhere!" },
      { who: "ai", text: "If it's safe, shut off your main water valve. I'm texting Ray now so he can call you straight back." },
      { who: "caller", text: "Okay — the valve's off." },
    ],
    badges: [{ label: "Emergency", tone: "bad" }],
    result: { icon: "alert", title: "Emergency text sent to Ray", detail: "Burst pipe · 14 Elm St · call back now" },
  },
  {
    tab: "Law firm",
    business: "Okafor & Lane",
    caller: "Dana Whitmore",
    lines: [
      { who: "ai", text: "Okafor & Lane, good afternoon. How can I help you?" },
      { who: "caller", text: "I need advice on a tenancy dispute. Could a lawyer call me back?" },
      { who: "ai", text: "Of course. May I take your name and the best number to reach you?" },
      { who: "caller", text: "Dana Whitmore — this number is fine." },
    ],
    badges: [{ label: "Message", tone: "brand" }],
    result: { icon: "message", title: "Message taken", detail: "Tenancy dispute · callback requested" },
  },
];

const TONE = {
  good: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300",
  bad: "bg-red-500/10 text-red-700 ring-red-600/25 dark:text-red-300",
  warn: "bg-amber-500/12 text-amber-800 ring-amber-600/25 dark:text-amber-300",
  brand: "bg-primary/10 text-primary ring-primary/20",
};

const RESULT_ICON = { booked: CalendarCheck2, alert: BellRing, message: MessageSquareText };

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;

const STEP_MS = 1700;
const HOLD_MS = 4200;

export function LiveCallDemo() {
  const [index, setIndex] = useState(0);
  // How many lines are visible; lines.length + 1 also shows the result.
  const [step, setStep] = useState(1);
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);

  const scenario = SCENARIOS[index];
  const total = scenario.lines.length + 1;
  const shown = reduced ? total : step;

  useEffect(() => {
    if (reduced) return;
    const done = step >= total;
    const t = setTimeout(
      () => {
        if (done) {
          setIndex((i) => (i + 1) % SCENARIOS.length);
          setStep(1);
        } else {
          setStep((s) => s + 1);
        }
      },
      done ? HOLD_MS : STEP_MS
    );
    return () => clearTimeout(t);
  }, [step, total, reduced]);

  const ResultIcon = RESULT_ICON[scenario.result.icon];
  const finished = shown >= total;

  return (
    <div className="relative">
      {/* Warm glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 rounded-[3rem] bg-[radial-gradient(closest-side,var(--brand-glow),transparent)] blur-2xl"
      />

      <div className="relative overflow-hidden rounded-[1.25rem] bg-card shadow-elevated ring-1 ring-foreground/[0.08]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <Bot strokeWidth={1.75} className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{scenario.business}</p>
              <p className="truncate text-xs text-muted-foreground">Caller · {scenario.caller}</p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:text-emerald-300">
            <span className="flex h-3 items-end gap-[2px]" aria-hidden>
              {[0, 1, 2, 3].map((b) => (
                <span
                  key={b}
                  className={cn("w-[2px] rounded-full bg-emerald-500", !finished && !reduced && "animate-wave-bar")}
                  style={{ height: "100%", animationDelay: `${b * 0.15}s`, transform: finished ? "scaleY(0.35)" : undefined }}
                />
              ))}
            </span>
            {finished ? "Call ended" : "Live call"}
          </span>
        </div>

        {/* Transcript */}
        <ol className="flex h-[17rem] flex-col sm:h-[19rem] justify-end gap-2.5 overflow-hidden px-5 py-4 text-[0.875rem]" aria-live="polite">
          {scenario.lines.slice(0, Math.min(shown, scenario.lines.length)).map((line, i) => {
            const ai = line.who === "ai";
            return (
              <li
                key={`${index}-${i}`}
                className={cn("flex animate-fade-up", ai ? "justify-start" : "justify-end")}
                style={{ animationDuration: "0.45s" }}
              >
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 leading-snug",
                    ai
                      ? "rounded-tl-md bg-primary/[0.08] ring-1 ring-inset ring-primary/10"
                      : "rounded-tr-md bg-muted ring-1 ring-inset ring-foreground/[0.05]"
                  )}
                >
                  {line.text}
                </p>
              </li>
            );
          })}
        </ol>

        {/* Outcome */}
        <div className="border-t border-border/70 bg-muted/30 px-5 py-4">
          <div
            className={cn(
              "flex items-center gap-3 transition-all duration-500",
              finished ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            )}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-xs-tinted ring-1 ring-foreground/[0.06]">
              <ResultIcon strokeWidth={1.75} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{scenario.result.title}</p>
              <p className="truncate text-xs text-muted-foreground">{scenario.result.detail}</p>
            </div>
            <div className="hidden shrink-0 gap-1.5 sm:flex">
              {scenario.badges.map((b) => (
                <span
                  key={b.label}
                  className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONE[b.tone])}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scenario switcher */}
      <div className="relative mt-5 flex justify-center gap-1.5" role="tablist" aria-label="Example calls">
        {SCENARIOS.map((s, i) => (
          <button
            key={s.tab}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => {
              setIndex(i);
              setStep(1);
            }}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              i === index ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s.tab}
          </button>
        ))}
      </div>
    </div>
  );
}
