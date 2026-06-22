import { Badge } from "@/components/ui/badge";

type Urgency = "emergency" | "urgent" | "routine" | "unknown";

const config: Record<Urgency, { label: string; className: string; pulse?: boolean }> = {
  emergency: { label: "Emergency", className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800", pulse: true },
  urgent: { label: "Urgent", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" },
  routine: { label: "Routine", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800" },
  unknown: { label: "Unknown", className: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
};

export function UrgencyBadge({ urgency }: { urgency: Urgency | null | undefined }) {
  if (!urgency) return <Badge variant="outline" className="text-slate-400">—</Badge>;
  const { label, className, pulse } = config[urgency];
  return (
    <Badge variant="outline" className={`${className}${pulse ? " animate-emergency-pulse" : ""}`}>
      {label}
    </Badge>
  );
}
