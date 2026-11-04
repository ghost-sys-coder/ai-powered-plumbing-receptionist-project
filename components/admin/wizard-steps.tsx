"use client";

import { Check } from "lucide-react";

// Step indicator for the setup wizard. Completed steps are clickable so the
// admin can jump back; future steps are reached with "Next" (which validates).
export function WizardSteps({
  steps,
  current,
  onSelect,
}: {
  steps: string[];
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm" aria-label="Setup progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!done}
              onClick={() => onSelect(i)}
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full px-3 py-1 transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                  active ? "border-primary-foreground/40" : "border-current"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {label}
            </button>
            {i < steps.length - 1 && <span className="text-muted-foreground">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
