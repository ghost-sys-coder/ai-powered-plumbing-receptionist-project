"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Wrench, Phone, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
          ? "bg-[#0b1326]/90 backdrop-blur-md border-b border-slate-800/80 shadow-md py-3.5"
          : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 sm:px-8">
        {/* Brand Logo */}
        <Link href="/v2" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0070f3] text-white shadow-md shadow-blue-500/20 group-hover:bg-[#0058c3] transition-colors">
            <Wrench className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-white leading-none">
              PlumberAnswered
            </span>
            <span className="text-[10px] font-semibold text-blue-400 tracking-wider uppercase mt-0.5">
              AI Voice Receptionist
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a
            href="#problem"
            className="hover:text-blue-400 transition-colors"
          >
            The Problem
          </a>
          <a
            href="#how-it-works"
            className="hover:text-blue-400 transition-colors"
          >
            How It Works
          </a>
          <a
            href="#features"
            className="hover:text-blue-400 transition-colors"
          >
            Features & Triage
          </a>
          <a
            href="#pricing"
            className="hover:text-blue-400 transition-colors"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="hover:text-blue-400 transition-colors"
          >
            FAQ
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href={`tel:${demoNumber.replace(/\s/g, "")}`}
            className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-blue-500 hover:text-white transition-all"
          >
            <Phone className="h-3.5 w-3.5 text-blue-400" />
            <span>Call Live AI: {demoNumber}</span>
          </a>

          {!isLoaded ? (
            <Skeleton className="h-9 w-28 rounded-lg bg-slate-800" />
          ) : isSignedIn ? (
            <Button
              asChild
              size="sm"
              className="bg-[#0070f3] text-white hover:bg-[#0058c3] font-semibold text-xs rounded-lg px-4"
            >
              <Link href={dashboardUrl}>
                {user?.publicMetadata?.role === "admin" ? "Admin Console" : "Dashboard"}
              </Link>
            </Button>
          ) : (
            <Calcom className="rounded-lg bg-[#0070f3] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0058c3] transition-all cursor-pointer" />
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#0b1326]/95 backdrop-blur-lg px-6 py-5">
          <div className="flex flex-col gap-4 text-sm font-medium text-slate-300">
            <a
              href="#problem"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-blue-400 py-1"
            >
              The Problem
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-blue-400 py-1"
            >
              How It Works
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-blue-400 py-1"
            >
              Features & Triage
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-blue-400 py-1"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-blue-400 py-1"
            >
              FAQ
            </a>

            <div className="pt-3 border-t border-slate-800 flex flex-col gap-3">
              <a
                href={`tel:${demoNumber.replace(/\s/g, "")}`}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200"
              >
                <Phone className="h-4 w-4 text-blue-400" />
                <span>Call Live Demo: {demoNumber}</span>
              </a>

              {!isLoaded ? (
                <Skeleton className="h-10 w-full rounded-lg bg-slate-800" />
              ) : isSignedIn ? (
                <Button
                  asChild
                  className="w-full bg-[#0070f3] text-white hover:bg-[#0058c3] font-semibold text-sm"
                >
                  <Link href={dashboardUrl}>
                    {user?.publicMetadata?.role === "admin" ? "Admin Console" : "Dashboard"}
                  </Link>
                </Button>
              ) : (
                <Calcom className="w-full text-center rounded-lg bg-[#0070f3] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0058c3] cursor-pointer" />
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
