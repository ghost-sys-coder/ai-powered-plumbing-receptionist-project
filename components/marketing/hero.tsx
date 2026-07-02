"use client";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Calcom from "./calcom";
import { Skeleton } from "../ui/skeleton";

export function Hero() {
  const { isLoaded, isSignedIn, user } = useUser();
  const demoNumber = process.env.NEXT_PUBLIC_DEMO_NUMBER ?? "+15717438660";
  const dashboardUrl = user?.publicMetadata?.role === "admin" ? "/admin" : "/dashboard";
  const telLink = `tel:${demoNumber.replace(/\s/g, "")}`;
  const displayNumber = demoNumber;

  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-20 pb-16 text-center">
      <h1
        className="animate-hero-fade-up max-w-2xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl"
        style={{ animationDelay: "0ms" }}
      >
        Solo plumbers lose $40,000
        <br />a year in missed calls.
      </h1>

      <p
        className="animate-hero-fade-up mt-6 max-w-xl text-base leading-relaxed sm:text-lg"
        style={{ color: "#A1A1AA", animationDelay: "150ms" }}
      >
        An AI receptionist that answers every call, triages emergencies,
        and books jobs on your calendar.
        <br />
        Done-for-you in 48 hours. $250/month.
      </p>

      <div
        className="animate-hero-fade-up mt-8 flex flex-col items-center gap-4 sm:flex-row"
        style={{ animationDelay: "300ms" }}
      >
        <Button
          asChild
          size="lg"
          className="bg-[#2563EB] px-8 text-base font-semibold text-white hover:bg-[#1d4ed8]"
        >
          <a href={telLink}>Call the demo — hear it yourself</a>
        </Button>

        {!isLoaded ? (<Skeleton className="w-full rounded-md bg-gray-600" />)
          : isSignedIn ? (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white bg-transparent px-8 text-base font-semibold text-white hover:bg-white hover:text-black"
            >
              <Link href={dashboardUrl} target="_blank" rel="noopener noreferrer">
                {user?.publicMetadata?.role === "admin" ? "Admin Dashboard" : "User Dashboard"}
              </Link>
            </Button>
          ) : (
            <Calcom className="w-full bg-[#2563EB] text-white hover:bg-[#1d4ed8] px-2 py-2 rounded-md shadow-lg" />
          )}
      </div>

      <p
        className="animate-hero-fade-up mt-4 text-sm"
        style={{ color: "#A1A1AA", animationDelay: "450ms" }}
      >
        {displayNumber} &middot; Call now &middot; No signup required
      </p>
    </section>
  );
}
