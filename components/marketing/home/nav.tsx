"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import Calcom from "@/components/marketing/calcom";
import { isStaffRole } from "@/lib/auth/roles";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { BrandMark } from "./shared";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#industries", label: "Industries" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const CTA =
  "inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.2),0_1px_2px_oklch(0.45_0.12_48/0.3)] transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]";

export function HomeNav() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const staff = isStaffRole(user?.publicMetadata?.role);
  const dashboardUrl = staff ? "/admin" : "/dashboard";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const account =
    !isLoaded ? null : isSignedIn ? (
      <Button asChild size="sm">
        <Link href={dashboardUrl}>{staff ? "Admin console" : "Dashboard"}</Link>
      </Button>
    ) : (
      <>
        <Link
          href="/sign-in"
          className="px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
        <Calcom className={CTA} />
      </>
    );

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled || open
          ? "border-b border-border/70 bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${BRAND.name} home`}>
          <BrandMark className="size-8" />
          <span className="text-[0.9375rem] font-semibold tracking-tight">{BRAND.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle quiet />
          {account}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle quiet />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/70 px-5 pt-3 pb-5 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-border/50 py-3 text-[0.9375rem] font-medium"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col-reverse items-stretch gap-3 [&>a]:text-center [&>button]:h-10 [&>button]:w-full">
            {account}
          </div>
        </div>
      )}
    </header>
  );
}
