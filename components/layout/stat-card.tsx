import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, subtext, trend }: StatCardProps) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          {trend && (
            <span className={`mb-1 text-xs font-medium ${
              trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-muted-foreground"
            }`}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"}
            </span>
          )}
        </div>
        {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}
