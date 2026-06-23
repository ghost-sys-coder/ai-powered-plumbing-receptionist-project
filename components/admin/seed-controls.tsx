"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Database, Trash2 } from "lucide-react";

type SeedState = "idle" | "seeding" | "wiping" | "done" | "error";

export function SeedControls() {
  const router = useRouter();
  const [state, setState] = useState<SeedState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSeed() {
    setState("seeding");
    setMessage(null);

    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setMessage(data.error ?? "Seed failed");
        return;
      }

      setMessage(
        `Seeded: Hightower Plumbing — ${data.calls} calls, ${data.bookings} bookings`
      );
      setState("done");
      router.refresh();
    } catch {
      setState("error");
      setMessage("Network error — please try again");
    }
  }

  async function handleWipe() {
    setState("wiping");
    setMessage(null);

    try {
      const res = await fetch("/api/admin/seed", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setMessage(data.error ?? "Wipe failed");
        return;
      }

      setMessage("Seed data wiped.");
      setState("done");
      router.refresh();
    } catch {
      setState("error");
      setMessage("Network error — please try again");
    }
  }

  const busy = state === "seeding" || state === "wiping";

  return (
    <div className="flex items-center gap-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            className="gap-2"
          >
            <Database className="h-3.5 w-3.5" />
            {state === "seeding" ? "Seeding..." : "Seed demo data"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seed Hightower demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will insert Hightower Plumbing as a customer with a demo agent,
              14 sample calls, and 8 bookings. Any existing Hightower seed data
              will be wiped and replaced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSeed}>
              Seed data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {state === "wiping" ? "Wiping..." : "Wipe seed data"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wipe Hightower seed data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the Hightower Plumbing customer, their
              agent, all 14 calls, and all bookings from the database. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWipe}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Wipe data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {message && (
        <p
          className={`text-xs ${
            state === "error" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
