import { Badge } from "@/components/ui/badge";

type Outcome = "booked" | "message_taken" | "transferred" | "dropped" | "abandoned";

const config: Record<Outcome, { label: string; className: string }> = {
  booked: { label: "Booked", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800" },
  message_taken: { label: "Message", className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
  transferred: { label: "Transferred", className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800" },
  dropped: { label: "Dropped", className: "bg-red-50 text-red-500 border-red-100 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900" },
  abandoned: { label: "Abandoned", className: "bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800" },
};

export function OutcomeBadge({ outcome }: { outcome: Outcome | null | undefined }) {
  if (!outcome) return <Badge variant="outline" className="text-slate-400">—</Badge>;
  const { label, className } = config[outcome];
  return <Badge variant="outline" className={className}>{label}</Badge>;
}
