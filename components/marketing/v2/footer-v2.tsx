import Link from "next/link";
import { Wrench, Mail, ShieldCheck } from "lucide-react";

export function FooterV2() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@plumberanswered.com";

  return (
    <footer
      className="py-20 md:py-24"
      style={{
        borderTop: `1px solid var(--v2-border)`,
        backgroundColor: "var(--v2-bg-alt)",
        color: "var(--v2-text-muted)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand Info */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3">
            <Link href="/marketing/v2" className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm"
                style={{ backgroundColor: "var(--v2-primary)", color: "var(--v2-text-on-primary)" }}
              >
                <Wrench className="h-4 w-4" />
              </div>
              <span className="font-bold text-lg" style={{ color: "var(--v2-text)" }}>PlumberAnswered</span>
            </Link>
            <p className="text-xs sm:text-sm max-w-sm" style={{ color: "var(--v2-text-muted)" }}>
              The 24/7 AI receptionist engineered for solo and professional plumbing businesses.
            </p>
          </div>

          {/* Links & Support */}
          <div className="flex flex-wrap justify-center md:justify-end items-center gap-6 text-xs sm:text-sm font-medium">
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 transition-colors"
              style={{ color: "var(--v2-text-secondary)" }}
            >
              <Mail className="h-4 w-4" style={{ color: "var(--v2-primary)" }} />
              <span>{email}</span>
            </a>
            <span className="hidden sm:inline" style={{ color: "var(--v2-border)" }}>|</span>
            <Link href="#problem" className="transition-colors" style={{ color: "var(--v2-text-muted)" }}>
              The Problem
            </Link>
            <Link href="#how-it-works" className="transition-colors" style={{ color: "var(--v2-text-muted)" }}>
              How It Works
            </Link>
            <Link href="#pricing" className="transition-colors" style={{ color: "var(--v2-text-muted)" }}>
              Pricing
            </Link>
            <Link href="#faq" className="transition-colors" style={{ color: "var(--v2-text-muted)" }}>
              FAQ
            </Link>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div
          className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{
            borderTop: `1px solid var(--v2-border)`,
            color: "var(--v2-text-muted)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--v2-icon-emerald)" }} />
            <span>&copy; {new Date().getFullYear()} PlumberAnswered. All rights reserved. Built for professional plumbing services.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="cursor-pointer hover:opacity-80">Privacy Policy</span>
            <span>&middot;</span>
            <span className="cursor-pointer hover:opacity-80">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
