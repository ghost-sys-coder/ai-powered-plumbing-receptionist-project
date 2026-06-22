"use client";

import { CheckCircle, Circle, Loader2 } from "lucide-react";

export type ProvisioningStep = {
  label: string;
  status: "pending" | "active" | "done" | "error";
};

export function ProvisioningProgress({ steps }: { steps: ProvisioningStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3 animate-step-complete">
          {step.status === "done" && (
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
          )}
          {step.status === "active" && (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-600" />
          )}
          {step.status === "pending" && (
            <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          {step.status === "error" && (
            <Circle className="h-5 w-5 shrink-0 text-red-500" />
          )}
          <span
            className={`text-sm ${
              step.status === "active"
                ? "font-medium"
                : step.status === "done"
                ? "text-muted-foreground"
                : step.status === "error"
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
