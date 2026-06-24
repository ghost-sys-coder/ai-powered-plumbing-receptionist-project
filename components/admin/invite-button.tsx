"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type State = "idle" | "loading" | "revoking" | "success" | "revoked" | "duplicate" | "error";

export function InviteButton({ customerId }: { customerId: string }) {
  const [state, setState] = useState<State>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSend() {
    setState("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/customers/${customerId}/invite`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "duplicate_invitation") {
          setState("duplicate");
          setErrorMessage(data.error ?? "Pending invitation already exists.");
        } else {
          setState("error");
          setErrorMessage(data.error ?? "Something went wrong");
        }
      } else {
        setState("success");
      }
    } catch {
      setState("error");
      setErrorMessage("Network error — please try again");
    }
  }

  async function handleRevoke() {
    setState("revoking");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/customers/${customerId}/invite`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        setState("duplicate");
        setErrorMessage(data.error ?? "Failed to revoke invitation");
      } else {
        setState("revoked");
        setErrorMessage(null);
      }
    } catch {
      setState("duplicate");
      setErrorMessage("Network error — please try again");
    }
  }

  if (state === "success") {
    return (
      <p className="text-sm font-medium text-green-600 dark:text-green-400">
        Invite sent ✓
      </p>
    );
  }

  if (state === "revoked") {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Invitation revoked.</p>
        <Button size="sm" variant="outline" onClick={() => { setState("idle"); setErrorMessage(null); }}>
          Send new invite
        </Button>
      </div>
    );
  }

  const busy = state === "loading" || state === "revoking";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSend}
          disabled={busy}
        >
          {state === "loading" ? "Sending…" : "Send login invite"}
        </Button>

        {(state === "duplicate" || state === "revoking") && (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleRevoke}
            disabled={busy}
          >
            {state === "revoking" ? "Revoking…" : "Clear Clerk access"}
          </Button>
        )}
      </div>

      {(state === "error" || state === "duplicate" || state === "revoking") && errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
