"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Check, Sparkles, PhoneCall, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Calcom from "@/components/marketing/calcom";

export function PricingV2() {
  const { isLoaded, isSignedIn, user } = useUser();
  const demoNumber = process.env.NEXT_PUBLIC_DEMO_NUMBER ?? "+1 (571) 743-8660";
  const dashboardUrl = user?.publicMetadata?.role === "admin" ? "/admin" : "/dashboard";
  const telLink = `tel:${demoNumber.replace(/[^0-9+]/g, "")}`;

  const inclusions = [
    "Custom AI receptionist trained on your plumbing services",
    "Dedicated local or toll-free US phone number",
    "Google Calendar integration & automated booking",
    "Full web dashboard with audio logs & transcripts",
    "Instant SMS emergency alerts for burst pipes & leaks",
    "Continuous weekly prompt tuning & custom knowledge base",
    "Live uptime monitoring & dedicated support",
    "Zero long-term contracts — cancel or pause anytime",
  ];

  return (
    <section id="pricing" className="py-32 md:py-40 bg-[#0b1326] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0070f3]/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-300 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Straightforward Pricing</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Simple, predictable pricing. No lock-in.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
            One extra booked water heater replacement covers your AI receptionist for an entire year.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="mx-auto max-w-xl">
          <div className="relative rounded-3xl border-2 border-[#0070f3] bg-[#0f172a] p-8 sm:p-10 shadow-2xl shadow-blue-500/10">
            {/* Top Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0070f3] px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
              Most Popular · Plumber Pro Package
            </div>

            <div className="flex flex-col items-center text-center">
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-400">
                Complete AI Receptionist
              </span>

              <div className="mt-4 flex items-baseline justify-center gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  $250
                </span>
                <span className="text-lg font-medium text-slate-400">/ month</span>
              </div>

              <p className="mt-2 text-xs sm:text-sm font-medium text-slate-400">
                +$2,500 one-time white-glove setup & custom training
              </p>
            </div>

            {/* Inclusions List */}
            <div className="mt-8 border-t border-slate-800 pt-8">
              <ul className="space-y-3.5">
                {inclusions.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <div className="mt-10">
              {!isLoaded ? (
                <Skeleton className="h-12 w-full rounded-xl bg-slate-800" />
              ) : isSignedIn ? (
                <Button
                  asChild
                  className="w-full bg-[#0070f3] hover:bg-[#0058c3] text-white py-6 rounded-xl font-bold text-base shadow-lg shadow-blue-500/20"
                >
                  <Link href={dashboardUrl} className="flex items-center justify-center gap-2">
                    <span>{user?.publicMetadata?.role === "admin" ? "Admin Console" : "Open Dashboard"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Calcom className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0070f3] py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-[#0058c3] transition-all cursor-pointer" />
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>30-Day Money-Back Satisfaction Guarantee</span>
            </div>
          </div>
        </div>

        {/* Call Demo Fallback */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-400">
            Want to test the voice quality first?{" "}
            <a
              href={telLink}
              className="inline-flex items-center gap-1.5 font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>Call the live demo: {demoNumber}</span>
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
