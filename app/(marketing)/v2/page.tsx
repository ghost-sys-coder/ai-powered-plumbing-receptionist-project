import type { Metadata } from "next";
import { NavV2 } from "@/components/marketing/v2/nav-v2";
import { HeroV2 } from "@/components/marketing/v2/hero-v2";
import { ProblemSectionV2 } from "@/components/marketing/v2/problem-section-v2";
import { HowItWorksV2 } from "@/components/marketing/v2/how-it-works-v2";
import { TriageFeaturesV2 } from "@/components/marketing/v2/triage-features-v2";
import { PricingV2 } from "@/components/marketing/v2/pricing-v2";
import { FaqV2 } from "@/components/marketing/v2/faq-v2";
import { FooterV2 } from "@/components/marketing/v2/footer-v2";

export const metadata: Metadata = {
  title: "PlumberAnswered v2 — 24/7 AI Receptionist for Plumbers",
  description:
    "Your phone should never lose you a plumbing job. PlumberAnswered is an AI receptionist that answers calls, qualifies homeowners, triages emergencies, and books jobs 24/7.",
  openGraph: {
    title: "PlumberAnswered — 24/7 AI Receptionist for Plumbers",
    description:
      "Never miss a plumbing lead again. Automated 24/7 call answering, emergency triage, and Google Calendar booking.",
  },
};

export default function MarketingV2Page() {
  return (
    <div className="relative min-h-screen selection:bg-[#0070f3] selection:text-white font-sans antialiased overflow-x-hidden" style={{ backgroundColor: "var(--v2-bg)", color: "var(--v2-text)" }}>
      {/* Subtle blue perimeter wrapper fading inwards */}
      <div
        className="pointer-events-none fixed inset-0 z-50 border border-[#0070f3]/30 shadow-[inset_0_0_12px_rgba(0,112,243,0.18)] dark:border-[#0070f3]/40 dark:shadow-[inset_0_0_16px_rgba(0,112,243,0.28)]"
        aria-hidden="true"
      />
      <NavV2 />
      <main>
        <HeroV2 />
        <ProblemSectionV2 />
        <HowItWorksV2 />
        <TriageFeaturesV2 />
        <PricingV2 />
        <FaqV2 />
      </main>
      <FooterV2 />
    </div>
  );
}
