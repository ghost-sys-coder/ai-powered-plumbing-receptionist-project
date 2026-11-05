import Link from "next/link";
import Calcom from "@/components/marketing/calcom";
import { BRAND } from "@/lib/brand";
import { BrandMark, Container, DEMO_NUMBER, formatDemoNumber } from "./shared";

export function FinalCta() {
  return (
    <section className="pb-24 sm:pb-32">
      <Container>
        <div className="reveal-on-scroll relative overflow-hidden rounded-[1.75rem] bg-card px-6 py-16 text-center shadow-elevated ring-1 ring-foreground/[0.07] sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="marketing-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_80%_at_50%_100%,black,transparent)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--brand-glow),transparent)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-[2.75rem]">
              Stop sending customers to voicemail.
            </h2>
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-pretty text-muted-foreground">
              Book a short call and we&apos;ll set up your receptionist with you
              {DEMO_NUMBER ? ", or ring the demo line to hear it for yourself." : "."}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Calcom className="inline-flex h-12 cursor-pointer items-center justify-center rounded-xl bg-primary px-6 text-[0.9375rem] font-medium text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.2),0_8px_20px_-8px_oklch(0.5_0.13_48/0.7)] transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]" />
              {DEMO_NUMBER && (
                <a
                  href={`tel:${DEMO_NUMBER.replace(/\s/g, "")}`}
                  className="tabular inline-flex h-12 items-center justify-center rounded-xl px-5 text-[0.9375rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Demo line {formatDemoNumber(DEMO_NUMBER)}
                </a>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#how-it-works", label: "How it works" },
      { href: "#features", label: "Features" },
      { href: "#pricing", label: "Pricing" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/sign-in", label: "Sign in" },
      { href: `mailto:${BRAND.supportEmail}`, label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/data-deletion", label: "Data deletion" },
    ],
  },
];

export function HomeFooter() {
  return (
    <footer className="border-t border-border/70 py-14">
      <Container>
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark className="size-8" />
              <span className="font-semibold tracking-tight">{BRAND.name}</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The AI receptionist that answers every call for service businesses.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-8 text-sm sm:gap-16">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <p className="font-medium">{c.title}</p>
                <ul className="mt-3 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      {l.href.startsWith("/") ? (
                        <Link href={l.href} className="text-muted-foreground transition-colors hover:text-foreground">
                          {l.label}
                        </Link>
                      ) : (
                        <a href={l.href} className="text-muted-foreground transition-colors hover:text-foreground">
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-12 border-t border-border/70 pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
