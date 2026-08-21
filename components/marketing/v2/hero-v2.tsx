"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { PhoneCall, ShieldCheck, Clock, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Calcom from "@/components/marketing/calcom";
import { PhoneSimulator } from "./phone-simulator";

export function HeroV2() {
  const { isLoaded, isSignedIn, user } = useUser();
  const demoNumber = process.env.NEXT_PUBLIC_DEMO_NUMBER ?? "+1 (571) 743-8660";
  const dashboardUrl = user?.publicMetadata?.role === "admin" ? "/admin" : "/dashboard";
  const telLink = `tel:${demoNumber.replace(/[^0-9+]/g, "")}`;

  return (
    <section className="relative overflow-hidden pt-36 pb-28 md:pt-48 md:pb-36">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none -z-10">
        <div className="absolute top-10 left-1/4 h-[350px] w-[350px] rounded-full blur-[120px]" style={{ backgroundColor: "var(--v2-primary-glow)" }} />
        <div className="absolute top-20 right-1/4 h-[300px] w-[300px] rounded-full blur-[100px]" style={{ backgroundColor: "var(--v2-primary-subtle)" }} />
      </div>

      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Copy & CTAs */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left lg:col-span-7">
            {/* Top pill badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold mb-6 backdrop-blur-sm"
              style={{
                border: `1px solid var(--v2-badge-blue-border)`,
                backgroundColor: "var(--v2-badge-blue-bg)",
                color: "var(--v2-badge-blue-text)",
              }}
            >
              <span className="flex h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--v2-primary)" }} />
              <span>Engineered Exclusively for Plumbing Contractors</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:leading-[1.1]" style={{ color: "var(--v2-text)" }}>
              Your phone should{" "}
              <span style={{ color: "var(--v2-primary)" }}>
                never lose you
              </span>{" "}
              a plumbing job.
            </h1>

            {/* Subheadline */}
            <p className="mt-6 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: "var(--v2-text-muted)" }}>
              <strong style={{ color: "var(--v2-text)", fontWeight: 600 }}>PlumberAnswered</strong> is a 24/7 AI
              receptionist that answers every incoming call, triages high-margin emergencies,
              qualifies homeowner leads, and books jobs directly to your calendar while you're under a sink.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              {!isLoaded ? (
                <Skeleton className="h-12 w-44 rounded-xl" />
              ) : isSignedIn ? (
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto font-semibold text-base px-8 py-6 rounded-xl shadow-lg"
                  style={{ backgroundColor: "var(--v2-primary)", color: "var(--v2-text-on-primary)" }}
                >
                  <Link href={dashboardUrl} className="flex items-center gap-2">
                    <span>{user?.publicMetadata?.role === "admin" ? "Admin Console" : "Open Dashboard"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <div className="w-full sm:w-auto">
                  <Calcom
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold shadow-lg transition-all cursor-pointer v2-btn-primary"
                  />
                </div>
              )}

              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto font-semibold text-base px-6 py-6 rounded-xl transition-all"
                style={{
                  borderColor: "var(--v2-border)",
                  backgroundColor: "var(--v2-bg-card)",
                  color: "var(--v2-text-secondary)",
                }}
              >
                <a href={telLink} className="flex items-center gap-2.5">
                  <PhoneCall className="h-4 w-4 animate-pulse" style={{ color: "var(--v2-primary)" }} />
                  <span>Hear AI Demo: {demoNumber}</span>
                </a>
              </Button>
            </div>

            {/* Trust bullet indicators */}
            <div className="mt-8 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-y-3 gap-x-6 text-xs font-medium" style={{ color: "var(--v2-text-muted)" }}>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4" style={{ color: "var(--v2-icon-emerald)" }} />
                <span>Live in 48 hours</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" style={{ color: "var(--v2-icon-emerald)" }} />
                <span>No long-term contracts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" style={{ color: "var(--v2-icon-emerald)" }} />
                <span>Zero ring delays</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold font-mono" style={{ color: "var(--v2-primary)" }}>100%</span>
                <span>Plumbing terminology trained</span>
              </div>
            </div>
          </div>

          {/* Right Column: Phone Mockup Simulation */}
          <div className="lg:col-span-5 flex justify-center mt-6 lg:mt-0">
            <PhoneSimulator demoNumber={demoNumber} />
          </div>
        </div>
      </div>
    </section>
  );
}
