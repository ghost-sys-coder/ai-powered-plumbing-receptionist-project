"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type State = "idle" | "loading" | "success" | "error";

export function SetRoleButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setState("loading");
    setError(null);

    try {
      const res = await fetch(`/api/admin/customers/${customerId}/role`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setError(data.error ?? "Failed to set role");
        return;
      }

      setState("success");
      router.refresh();
    } catch {
      setState("error");
      setError("Network error — please try again");
    }
  }

  if (state === "success") {
    return (
      <p className="text-sm font-medium text-green-600 dark:text-green-400">
        Role set to client ✓
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={state === "loading"}
      >
        {state === "loading" ? "Setting role…" : "Set client role in Clerk"}
      </Button>
      {state === "error" && error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
