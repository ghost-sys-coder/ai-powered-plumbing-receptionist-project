import { cn } from "@/lib/utils";
import { PILL } from "@/components/calls/outcome-badge";

type Urgency = "emergency" | "urgent" | "routine" | "unknown";

const config: Record<Urgency, { label: string; pill: string; pulse?: boolean }> = {
  emergency: {
    label: "Emergency",
    pill: "bg-red-500/12 text-red-700 ring-red-600/30 dark:text-red-300",
    pulse: true,
  },
  urgent: { label: "Urgent", pill: "bg-amber-500/12 text-amber-800 ring-amber-600/25 dark:text-amber-300" },
  routine: { label: "Routine", pill: "bg-muted text-muted-foreground ring-foreground/10" },
  unknown: { label: "Unknown", pill: "bg-muted text-muted-foreground/80 ring-foreground/[0.07]" },
};

export function UrgencyBadge({ urgency }: { urgency: Urgency | null | undefined }) {
  if (!urgency) {
    return <span className={cn(PILL, "bg-muted text-muted-foreground ring-foreground/10")}>—</span>;
  }
  const { label, pill, pulse } = config[urgency];
  return <span className={cn(PILL, pill, pulse && "animate-emergency-pulse")}>{label}</span>;
}
