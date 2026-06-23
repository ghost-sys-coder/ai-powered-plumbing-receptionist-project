"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type State = "idle" | "loading" | "success" | "error";

export function InviteButton({ customerId }: { customerId: string }) {
  const [state, setState] = useState<State>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setState("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/customers/${customerId}/invite`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setErrorMessage(data.error ?? "Something went wrong");
      } else {
        setState("success");
      }
    } catch {
      setState("error");
      setErrorMessage("Network error — please try again");
    }
  }

  if (state === "success") {
    return (
      <p className="text-sm font-medium text-green-600 transition-opacity duration-300 dark:text-green-400">
        Invite sent ✓
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
        {state === "loading" ? "Sending..." : "Send login invite"}
      </Button>
      {state === "error" && errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
