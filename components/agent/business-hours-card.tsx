import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyNote, SectionHeader } from "@/components/layout/section-header";

type DayHours = { open?: string; close?: string; closed?: boolean };
type BusinessHours = Record<string, DayHours>;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function BusinessHoursCard({ hours }: { hours: unknown }) {
  const parsed = hours as BusinessHours | null;

  return (
    <Card>
      <SectionHeader
        icon={Clock}
        title="Business hours"
        description="The opening hours the receptionist gives callers"
      />
      <div className="px-5">
        {!parsed ? (
          <EmptyNote>No hours set yet.</EmptyNote>
        ) : (
          <ul className="grid gap-x-8 text-sm sm:grid-cols-2">
            {DAYS.map((day) => {
              const h = parsed[day] ?? parsed[day.toLowerCase()] ?? parsed[day.slice(0, 3).toLowerCase()];
              const closed = !h || h.closed;
              return (
                <li key={day} className="flex items-baseline justify-between border-b border-border/60 py-2.5">
                  <span className="font-medium">{day}</span>
                  <span className={closed ? "text-muted-foreground" : "tabular"}>
                    {closed ? "Closed" : `${h.open ?? "?"} – ${h.close ?? "?"}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
