import { ArrowRight, Check } from "lucide-react";
import Calcom from "@/components/marketing/calcom";
import { PLANS, TRIAL_DAYS, formatMoney, plansFor } from "@/lib/billing/plans";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Container, SectionHeading } from "./shared";

// Prices come straight from lib/billing/plans.ts, so this page always matches
// what Stripe charges.
const FEATURED = "direct_standard";

const BUTTON =
  "inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]";

export function Pricing() {
  const direct = plansFor("direct");
  const agency = plansFor("agency");
  const overage = formatMoney(PLANS.direct_basic.perMinute.usd, "usd");
  const agencyFrom = formatMoney(PLANS[agency[0]].monthly.usd, "usd");

  return (
    <section id="pricing" className="scroll-mt-20 border-y border-border/70 bg-card/40 py-24 sm:py-32">
      <Container>
        <SectionHeading
          align="center"
          eyebrow="Pricing"
          title="Simple plans. Every feature included."
          description={`Pick the plan that fits your call volume. Every plan starts with a ${TRIAL_DAYS}-day free trial, and extra minutes are ${overage} each.`}
        />

        <div className="mx-auto mt-14 grid max-w-5xl items-stretch gap-4 lg:grid-cols-3">
          {direct.map((id, i) => {
            const p = PLANS[id];
            const featured = id === FEATURED;
            return (
              <div
                key={id}
                className={cn(
                  "reveal-on-scroll relative flex flex-col rounded-2xl p-7",
                  featured
                    ? "bg-card shadow-elevated ring-2 ring-primary lg:-my-3 lg:py-10"
                    : "bg-card shadow-card ring-1 ring-foreground/[0.07]"
                )}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {featured && (
                  <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-xs-tinted">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold tracking-tight">{p.name}</h3>
                <p className="mt-1 min-h-10 text-sm text-muted-foreground">{p.description}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="tabular text-[2.75rem] leading-none font-semibold tracking-[-0.04em]">
                    {formatMoney(p.monthly.usd, "usd")}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.includedMinutes.toLocaleString("en-US")} minutes included
                </p>

                <ul className="mt-7 space-y-3 border-t border-border/70 pt-6 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.25} />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <Calcom
                    className={cn(
                      BUTTON,
                      featured
                        ? "bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.2),0_8px_20px_-8px_oklch(0.5_0.13_48/0.7)] hover:bg-primary/90"
                        : "bg-card ring-1 ring-foreground/12 hover:bg-muted/50"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Prices in US dollars. Businesses in Canada, the UK and Australia pay in local currency.
        </p>

        {/* Agencies */}
        <div className="reveal-on-scroll mx-auto mt-16 flex max-w-5xl flex-col gap-6 overflow-hidden rounded-2xl bg-foreground p-8 text-background sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-[color-mix(in_oklch,var(--primary),white_35%)] dark:text-[color-mix(in_oklch,var(--primary),black_25%)]">
              For agencies
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-balance">
              Offer AI receptionists to your own clients.
            </h3>
            <p className="mt-3 leading-relaxed text-background/70">
              Set up and manage a receptionist for each client from one console, with one monthly bill. Plans from{" "}
              {agencyFrom}/month plus usage.
            </p>
          </div>
          <a
            href={`mailto:${BRAND.supportEmail}?subject=Agency%20plans`}
            className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-background px-5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-background/90 active:scale-[0.98]"
          >
            Talk to us about agency plans
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </Container>
    </section>
  );
}
