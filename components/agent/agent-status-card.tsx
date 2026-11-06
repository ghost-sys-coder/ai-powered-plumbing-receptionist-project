import { Bot, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/section-header";
import type { VapiAgent } from "@/db/schema/vapi-agents";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; note: string; pill: string; dot: string }> = {
  active: {
    label: "Live",
    note: "Answering your calls",
    pill: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  paused: {
    label: "Paused",
    note: "Not answering calls right now",
    pill: "bg-amber-500/10 text-amber-800 ring-amber-600/25 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  error: {
    label: "Needs attention",
    note: "We're looking into it",
    pill: "bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-300",
    dot: "bg-red-500",
  },
};

export function AgentStatusCard({
  agent,
  livePhoneNumber,
}: {
  agent: VapiAgent;
  livePhoneNumber?: string | null;
}) {
  // Prefer the number live from Vapi; fall back to the stored value.
  const phoneNumber = livePhoneNumber ?? agent.phoneNumber;
  const status = STATUS[agent.status] ?? STATUS.error;

  return (
    <Card>
      <SectionHeader
        icon={Bot}
        title="Your receptionist"
        description={status.note}
        action={
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", status.pill)}>
            <span className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
        }
      />
      <div className="px-5">
        <div className="rounded-xl bg-muted/50 px-4 py-3.5 ring-1 ring-inset ring-foreground/5">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="size-3.5" />
            Receptionist number
          </p>
          <p className="tabular mt-0.5 text-xl font-semibold tracking-tight">
            {phoneNumber ?? <span className="text-sm font-normal text-muted-foreground">Being set up</span>}
          </p>
          {phoneNumber && (
            <p className="mt-1 text-xs text-muted-foreground">
              Forward your business line here to have every call answered.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
