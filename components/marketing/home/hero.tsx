import { Check, Phone } from "lucide-react";
import Calcom from "@/components/marketing/calcom";
import { BRAND } from "@/lib/brand";
import { LiveCallDemo } from "./live-call-demo";
import { Container, DEMO_NUMBER, formatDemoNumber } from "./shared";

const PRIMARY =
  "inline-flex h-12 cursor-pointer items-center justify-center rounded-xl bg-primary px-6 text-[0.9375rem] font-medium text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.2),0_8px_20px_-8px_oklch(0.5_0.13_48/0.7)] transition-all duration-200 hover:bg-primary/90 hover:-translate-y-px active:scale-[0.98]";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-20">
      {/* Grid texture fading out from the top, plus a warm wash */}
      <div
        aria-hidden
        className="marketing-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] size-[42rem] rounded-full bg-[radial-gradient(closest-side,var(--canvas-glow),transparent)]"
      />

      <Container className="relative grid items-center gap-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div>
          <p className="animate-hero-fade-up inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs-tinted ring-1 ring-foreground/[0.07]">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            AI receptionist for service businesses
          </p>

          <h1
            className="animate-hero-fade-up mt-6 text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.04em] text-balance sm:text-[3.75rem] lg:text-[4.25rem]"
            style={{ animationDelay: "60ms" }}
          >
            Every call answered.{" "}
            <span className="bg-linear-to-br from-primary to-[color-mix(in_oklch,var(--primary),black_25%)] bg-clip-text text-transparent dark:to-[color-mix(in_oklch,var(--primary),white_20%)]">
              Every customer looked after.
            </span>
          </h1>

          <p
            className="animate-hero-fade-up mt-6 max-w-[34rem] text-[1.125rem] leading-relaxed text-pretty text-muted-foreground"
            style={{ animationDelay: "120ms" }}
          >
            {`${BRAND.name} answers your phone in your business's name, day and night. It books appointments into your calendar, takes clear messages, and texts you the moment a caller has an emergency.`}
          </p>

          <div
            className="animate-hero-fade-up mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "180ms" }}
          >
            <Calcom className={PRIMARY} />
            {DEMO_NUMBER && (
              <a
                href={`tel:${DEMO_NUMBER.replace(/\s/g, "")}`}
                className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-card px-5 text-[0.9375rem] font-medium shadow-xs-tinted ring-1 ring-foreground/10 transition-all duration-200 hover:ring-foreground/20 active:scale-[0.98]"
              >
                <Phone className="size-4 text-primary transition-transform group-hover:-rotate-12" />
                <span>
                  Call the demo <span className="tabular text-muted-foreground">{formatDemoNumber(DEMO_NUMBER)}</span>
                </span>
              </a>
            )}
          </div>

          <ul
            className="animate-hero-fade-up mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"
            style={{ animationDelay: "240ms" }}
          >
            {["14-day free trial", "We set it up for you", "Cancel any time"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-4 text-primary" strokeWidth={2.25} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-hero-fade-up mx-auto w-full max-w-[30rem] lg:mr-0" style={{ animationDelay: "200ms" }}>
          <LiveCallDemo />
        </div>
      </Container>
    </section>
  );
}
