"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Shown on a receptionist with no phone number. Asks the server to issue one
// for the business's country and explains why when that isn't possible yet.
export function AddPhoneNumberButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/phone-number`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't add a number.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't add a number. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={add} disabled={busy}>
        {busy ? "Getting a number..." : "Add phone number"}
      </Button>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
