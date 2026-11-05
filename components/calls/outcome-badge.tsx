import { cn } from "@/lib/utils";

type Outcome = "booked" | "message_taken" | "transferred" | "dropped" | "abandoned";

export const PILL =
  "inline-flex h-5.5 w-fit shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

const config: Record<Outcome, { label: string; pill: string; dot: string }> = {
  booked: {
    label: "Booked",
    pill: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  message_taken: {
    label: "Message",
    pill: "bg-primary/10 text-primary ring-primary/20",
    dot: "bg-primary",
  },
  transferred: {
    label: "Transferred",
    pill: "bg-sky-500/10 text-sky-700 ring-sky-600/20 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  dropped: {
    label: "Dropped",
    pill: "bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-300",
    dot: "bg-red-500",
  },
  abandoned: {
    label: "Abandoned",
    pill: "bg-muted text-muted-foreground ring-foreground/10",
    dot: "bg-muted-foreground/50",
  },
};

export function OutcomeBadge({ outcome }: { outcome: Outcome | null | undefined }) {
  if (!outcome) {
    return <span className={cn(PILL, "bg-muted text-muted-foreground ring-foreground/10")}>—</span>;
  }
  const { label, pill, dot } = config[outcome];
  return (
    <span className={cn(PILL, pill)}>
      <span className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
