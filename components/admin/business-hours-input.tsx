"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export type BusinessHoursValue = Record<
  string,
  { open: string; close: string; closed: boolean }
>;

interface Props {
  value: BusinessHoursValue;
  onChange: (value: BusinessHoursValue) => void;
}

export function BusinessHoursInput({ value, onChange }: Props) {
  function update(
    day: string,
    field: "open" | "close" | "closed",
    val: string | boolean
  ) {
    onChange({ ...value, [day]: { ...value[day], [field]: val } });
  }

  return (
    <div className="space-y-2">
      {DAYS.map((day) => {
        const hours = value[day] ?? { open: "08:00", close: "17:00", closed: false };
        return (
          <div key={day} className="flex flex-wrap items-center gap-3">
            <span className="w-24 shrink-0 text-sm font-medium">{day}</span>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={hours.closed}
                onChange={(e) => update(day, "closed", e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Closed
            </label>
            {!hours.closed && (
              <>
                <Input
                  type="time"
                  value={hours.open}
                  onChange={(e) => update(day, "open", e.target.value)}
                  className="w-32 text-sm"
                />
                <span className="text-sm text-muted-foreground">–</span>
                <Input
                  type="time"
                  value={hours.close}
                  onChange={(e) => update(day, "close", e.target.value)}
                  className="w-32 text-sm"
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
