"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <nav aria-label="Setup progress">
      {/* Phones: compact "Step 2 of 5" with a progress bar. */}
      <div className="sm:hidden">
        <p className="text-xs text-muted-foreground">
          Step {current + 1} of {steps.length}
        </p>
        <p className="mt-0.5 font-medium">{steps[current]}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="hidden items-center sm:flex">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
              <button
                type="button"
                disabled={!done}
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex shrink-0 items-center gap-2.5 rounded-full py-1 pr-2 text-sm transition-colors",
                  done && "cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-semibold transition-all duration-300",
                    active && "bg-primary text-primary-foreground shadow-[0_0_0_4px] shadow-primary/15",
                    done && "bg-primary/12 text-primary ring-1 ring-primary/25 group-hover:bg-primary/20",
                    !active && !done && "bg-muted text-muted-foreground ring-1 ring-foreground/6"
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap",
                    active ? "font-semibold text-foreground" : done ? "text-foreground/80 group-hover:text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-3 h-px min-w-4 flex-1 transition-colors duration-300",
                    done ? "bg-primary/40" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
