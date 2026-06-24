"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL!;

  console.log("BOOKING URL:", process.env.NEXT_PUBLIC_BOOKING_URL);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? "nav-scrolled" : ""}`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-lg font-bold tracking-tight text-white">
          PlumberAnswered
        </span>

        <div className="hidden items-center gap-8 sm:flex">
          <Link
            href="#how-it-works"
            className="text-sm transition-colors hover:text-white"
            style={{ color: "#A1A1AA" }}
          >
            How it works
          </Link>
          <Link
            href="#pricing"
            className="text-sm transition-colors hover:text-white"
            style={{ color: "#A1A1AA" }}
          >
            Pricing
          </Link>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
        >
          <Link href={bookingUrl} target="_blank" rel="noopener noreferrer">
            Book a call
          </Link>
        </Button>
      </div>
    </nav>
  );
}
