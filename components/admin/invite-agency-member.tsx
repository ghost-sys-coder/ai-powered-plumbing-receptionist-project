"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Inline "invite staff by email" control for one agency row.
export function InviteAgencyMember({ agencyId, agencyName }: { agencyId: string; agencyName: string }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/agencies/${agencyId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Couldn't send the invite." });
        return;
      }
      setMessage({ ok: true, text: `Invite sent to ${email.trim()}` });
      setEmail("");
    } catch {
      setMessage({ ok: false, text: "Unexpected error. Please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="staff@agency.com"
          aria-label={`Invite staff to ${agencyName}`}
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={sending || !email.trim()}>
          {sending ? "Sending..." : "Invite"}
        </Button>
      </div>
      {message && (
        <p className={`text-xs ${message.ok ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
