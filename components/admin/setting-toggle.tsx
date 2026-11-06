"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// An on/off switch for one platform setting (PATCH /api/admin/settings).
export function SettingToggle({
  settingKey,
  initial,
  label,
  disabled = false,
}: {
  settingKey: string;
  initial: boolean;
  label: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !on;
    setSaving(true);
    setOn(next);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: settingKey, value: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't save");
      toast.success(next ? "Turned on" : "Turned off");
      router.refresh();
    } catch (err) {
      setOn(!next);
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={toggle}
      disabled={disabled || saving}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50",
        on ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "grid size-5 place-items-center rounded-full bg-white shadow-sm transition-transform duration-200",
          on ? "translate-x-5.5" : "translate-x-0.5"
        )}
      >
        {saving && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </span>
    </button>
  );
}
