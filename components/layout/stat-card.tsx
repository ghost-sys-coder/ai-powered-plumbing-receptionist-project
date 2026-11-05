import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, subtext, trend }: StatCardProps) {
  return (
    <Card size="sm" className="animate-fade-in relative gap-0 px-5 py-5">
      {/* Hairline highlight along the top edge. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent"
      />
      <p className="text-[0.8125rem] font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="tabular text-[2rem] font-semibold leading-none tracking-[-0.03em]">{value}</span>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : trend === "down"
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
            }`}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"}
          </span>
        )}
      </div>
      {subtext && <p className="mt-2 text-xs text-muted-foreground">{subtext}</p>}
    </Card>
  );
}
