import Link from "next/link";
import { Wrench, Mail, ShieldCheck } from "lucide-react";

export function FooterV2() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@plumberanswered.com";

  return (
    <footer className="border-t border-slate-800 bg-[#060c18] py-16 text-slate-400">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand Info */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3">
            <Link href="/v2" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0070f3] text-white shadow-sm">
                <Wrench className="h-4 w-4" />
              </div>
              <span className="font-bold text-lg text-white">PlumberAnswered</span>
            </Link>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
              The 24/7 AI receptionist engineered for solo and professional plumbing businesses.
            </p>
          </div>

          {/* Links & Support */}
          <div className="flex flex-wrap justify-center md:justify-end items-center gap-6 text-xs sm:text-sm font-medium">
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4 text-blue-400" />
              <span>{email}</span>
            </a>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <Link href="#problem" className="hover:text-white transition-colors">
              The Problem
            </Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>&copy; {new Date().getFullYear()} PlumberAnswered. All rights reserved. Built for professional plumbing services.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span>&middot;</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
