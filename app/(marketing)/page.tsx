import { Nav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { SocialProofBar } from "@/components/marketing/social-proof-bar";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { HandlesSection } from "@/components/marketing/handles-section";
import { Pricing } from "@/components/marketing/pricing";
import { Faq } from "@/components/marketing/faq";
import { Footer } from "@/components/marketing/footer";

export default function MarketingPage() {
  return (
    <main className="bg-[#0A0A0A] text-white min-h-screen">
      <Nav />
      <Hero />
      <SocialProofBar />
      <HowItWorks />
      <HandlesSection />
      <Pricing />
      <Faq />
      <Footer />
    </main>
  );
}
