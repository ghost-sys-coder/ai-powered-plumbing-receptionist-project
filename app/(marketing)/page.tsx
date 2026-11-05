import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { HomeNav } from "@/components/marketing/home/nav";
import { Hero } from "@/components/marketing/home/hero";
import { Industries } from "@/components/marketing/home/industries";
import { HowItWorks } from "@/components/marketing/home/how-it-works";
import { Features } from "@/components/marketing/home/features";
import { Pricing } from "@/components/marketing/home/pricing";
import { Faq } from "@/components/marketing/home/faq";
import { FinalCta, HomeFooter } from "@/components/marketing/home/footer";

const description =
  "An AI receptionist for service businesses. Answers every call in your business's name, books appointments into your calendar, takes messages and texts you about emergencies — 24/7.";

export const metadata: Metadata = {
  title: `${BRAND.name} — the AI receptionist that answers every call`,
  description,
  openGraph: {
    title: `${BRAND.name} — the AI receptionist that answers every call`,
    description,
  },
};

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-elevated"
      >
        Skip to content
      </a>
      <HomeNav />
      <main id="main">
        <Hero />
        <Industries />
        <HowItWorks />
        <Features />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <HomeFooter />
    </div>
  );
}
