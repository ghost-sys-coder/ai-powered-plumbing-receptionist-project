"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { X, Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type SeedState = "idle" | "seeding" | "wiping" | "done" | "error";

type SeedConfig = {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  serviceArea: string;
  plan: "pilot" | "standard";
  vapiAssistantId: string;
  agentPhone: string;
  emergencyDefinition: string;
};

const DEFAULTS: SeedConfig = {
  businessName: "Hightower Plumbing",
  ownerName: "Ray Hightower",
  email: "ecommercedock@gmail.com",
  phone: "+18135550192",
  city: "Tampa",
  state: "FL",
  serviceArea: "Hillsborough County",
  plan: "pilot",
  vapiAssistantId: "seed_demo_hightower_assistant",
  agentPhone: "+18135550192",
  emergencyDefinition:
    "Active flooding, burst pipe, no water in house, sewage backup, gas smell",
};

export function SeedControls() {
  const router = useRouter();
  const [state, setState] = useState<SeedState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<SeedConfig>(DEFAULTS);

  function field(key: keyof SeedConfig) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setConfig((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSeed() {
    setConfigOpen(false);
    setState("seeding");
    setMessage(null);

    try {
      const res = await fetch("/api/admin/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setMessage(data.error ?? "Seed failed");
        return;
      }

      setMessage(
        `Seeded: ${config.businessName} — ${data.calls} calls, ${data.bookings} bookings`
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
  const canSeed = config.businessName.trim() && config.ownerName.trim() && config.email.trim();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* ── Seed: configure then push ── */}
      <Dialog.Root open={configOpen} onOpenChange={setConfigOpen}>
        <Dialog.Trigger asChild>
          <Button variant="outline" size="sm" disabled={busy} className="gap-2">
            <Database className="h-3.5 w-3.5" />
            {state === "seeding" ? "Seeding…" : "Seed demo data"}
          </Button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-background p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-base font-semibold">
                  Configure seed data
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-sm text-muted-foreground">
                  Edit key fields before inserting. Calls and bookings are fixed.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>

            <div className="mt-5 space-y-5">
              {/* Customer section */}
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Customer
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="seed-businessName">Business name *</Label>
                  <Input
                    id="seed-businessName"
                    value={config.businessName}
                    onChange={field("businessName")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seed-ownerName">Owner name *</Label>
                  <Input
                    id="seed-ownerName"
                    value={config.ownerName}
                    onChange={field("ownerName")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seed-email">Email *</Label>
                  <Input
                    id="seed-email"
                    type="email"
                    value={config.email}
                    onChange={field("email")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seed-phone">Phone</Label>
                  <Input
                    id="seed-phone"
                    value={config.phone}
                    onChange={field("phone")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seed-city">City</Label>
                  <Input
                    id="seed-city"
                    value={config.city}
                    onChange={field("city")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seed-state">State</Label>
                  <Input
                    id="seed-state"
                    value={config.state}
                    onChange={field("state")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seed-serviceArea">Service area</Label>
                  <Input
                    id="seed-serviceArea"
                    value={config.serviceArea}
                    onChange={field("serviceArea")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seed-plan">Plan</Label>
                  <Select
                    value={config.plan}
                    onValueChange={(v) =>
                      setConfig((prev) => ({
                        ...prev,
                        plan: v as "pilot" | "standard",
                      }))
                    }
                  >
                    <SelectTrigger id="seed-plan" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pilot">Pilot</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Agent section */}
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Agent
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="seed-vapiAssistantId">VAPI assistant ID</Label>
                  <Input
                    id="seed-vapiAssistantId"
                    value={config.vapiAssistantId}
                    onChange={field("vapiAssistantId")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seed-agentPhone">Agent phone number</Label>
                  <Input
                    id="seed-agentPhone"
                    value={config.agentPhone}
                    onChange={field("agentPhone")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seed-emergencyDefinition">
                    Emergency definition
                  </Label>
                  <textarea
                    id="seed-emergencyDefinition"
                    aria-label="Emergency definition"
                    rows={3}
                    value={config.emergencyDefinition}
                    onChange={field("emergencyDefinition")}
                    className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setConfig(DEFAULTS)}
                className="text-muted-foreground"
              >
                Reset to defaults
              </Button>
              <div className="flex gap-2">
                <Dialog.Close asChild>
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button size="sm" onClick={handleSeed} disabled={!canSeed}>
                  Seed data
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Wipe: simple confirm ── */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {state === "wiping" ? "Wiping…" : "Wipe seed data"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wipe seed data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the seed customer, their Clerk
              account, agent, all calls, and all bookings. This cannot be
              undone.
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
