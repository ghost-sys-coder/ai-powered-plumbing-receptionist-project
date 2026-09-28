"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Wrench, Phone, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import Calcom from "@/components/marketing/calcom";

export function NavV2() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const demoNumber = process.env.NEXT_PUBLIC_DEMO_NUMBER ?? "+15717438660";
  const dashboardUrl = user?.publicMetadata?.role === "admin" ? "/admin" : "/dashboard";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "shadow-md py-3.5 backdrop-blur-md"
          : "py-5"
      }`}
      style={{
        backgroundColor: scrolled ? "color-mix(in srgb, var(--v2-bg) 92%, transparent)" : "transparent",
        borderBottom: scrolled ? `1px solid var(--v2-border)` : "none",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 sm:px-8">
        {/* Brand Logo */}
        <Link href="/marketing/v2" className="flex items-center gap-2.5 group">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg shadow-md group-hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "var(--v2-primary)", color: "var(--v2-text-on-primary)" }}
          >
            <Wrench className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight leading-none" style={{ color: "var(--v2-text)" }}>
              PlumberAnswered
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase mt-0.5" style={{ color: "var(--v2-primary)" }}>
              AI Voice Receptionist
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: "var(--v2-text-muted)" }}>
          <a href="#problem" className="hover:opacity-80 transition-opacity">The Problem</a>
          <a href="#how-it-works" className="hover:opacity-80 transition-opacity">How It Works</a>
          <a href="#features" className="hover:opacity-80 transition-opacity">Features & Triage</a>
          <a href="#pricing" className="hover:opacity-80 transition-opacity">Pricing</a>
          <a href="#faq" className="hover:opacity-80 transition-opacity">FAQ</a>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href={`tel:${demoNumber.replace(/\s/g, "")}`}
            className="hidden lg:flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all"
            style={{
              border: `1px solid var(--v2-border)`,
              backgroundColor: "var(--v2-bg-card)",
              color: "var(--v2-text-secondary)",
            }}
          >
            <Phone className="h-3.5 w-3.5" style={{ color: "var(--v2-primary)" }} />
            <span>Call Live AI: {demoNumber}</span>
          </a>

          <ThemeToggle />

          {!isLoaded ? (
            <Skeleton className="h-9 w-28 rounded-lg" />
          ) : isSignedIn ? (
            <Button
              asChild
              size="sm"
              className="font-semibold text-xs rounded-lg px-4"
              style={{ backgroundColor: "var(--v2-primary)", color: "var(--v2-text-on-primary)" }}
            >
              <Link href={dashboardUrl}>
                {user?.publicMetadata?.role === "admin" ? "Admin Console" : "Dashboard"}
              </Link>
            </Button>
          ) : (
            <Calcom
              className="rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-all cursor-pointer v2-btn-primary"
            />
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2"
            style={{ color: "var(--v2-text-secondary)" }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden backdrop-blur-lg px-6 py-5"
          style={{
            borderBottom: `1px solid var(--v2-border)`,
            backgroundColor: "color-mix(in srgb, var(--v2-bg) 95%, transparent)",
          }}
        >
          <div className="flex flex-col gap-4 text-sm font-medium" style={{ color: "var(--v2-text-muted)" }}>
            <a href="#problem" onClick={() => setMobileMenuOpen(false)} className="py-1">The Problem</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-1">How It Works</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-1">Features & Triage</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-1">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-1">FAQ</a>

            <div className="pt-3 flex flex-col gap-3" style={{ borderTop: `1px solid var(--v2-border)` }}>
              <a
                href={`tel:${demoNumber.replace(/\s/g, "")}`}
                className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold"
                style={{
                  border: `1px solid var(--v2-border)`,
                  backgroundColor: "var(--v2-bg-card)",
                  color: "var(--v2-text-secondary)",
                }}
              >
                <Phone className="h-4 w-4" style={{ color: "var(--v2-primary)" }} />
                <span>Call Live Demo: {demoNumber}</span>
              </a>

              {!isLoaded ? (
                <Skeleton className="h-10 w-full rounded-lg" />
              ) : isSignedIn ? (
                <Button
                  asChild
                  className="w-full font-semibold text-sm"
                  style={{ backgroundColor: "var(--v2-primary)", color: "var(--v2-text-on-primary)" }}
                >
                  <Link href={dashboardUrl}>
                    {user?.publicMetadata?.role === "admin" ? "Admin Console" : "Dashboard"}
                  </Link>
                </Button>
              ) : (
                <Calcom
                  className="w-full text-center rounded-lg py-2.5 text-sm font-semibold shadow-sm cursor-pointer v2-btn-primary"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
