"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IndustryProfile } from "@/lib/verticals";

type Props = {
  labels: IndustryProfile["pricingLabels"];
  serviceCallFee: string;
  hourlyRate: string;
  afterHoursSurcharge: string;
  freeEstimates: boolean;
  onServiceCallFee: (v: string) => void;
  onHourlyRate: (v: string) => void;
  onAfterHoursSurcharge: (v: string) => void;
  onFreeEstimates: (v: boolean) => void;
};

// Pricing inputs labelled for the customer's industry ("Service call fee" for
// trades, "Consultation fee" for law firms…). Fields the industry doesn't use
// are hidden — the prompt omits them too.
export function PricingFields({
  labels,
  serviceCallFee,
  hourlyRate,
  afterHoursSurcharge,
  freeEstimates,
  onServiceCallFee,
  onHourlyRate,
  onAfterHoursSurcharge,
  onFreeEstimates,
}: Props) {
  const anyField =
    labels.serviceCallFee || labels.hourlyRate || labels.afterHoursSurcharge || labels.freeEstimates;
  if (!anyField) return null;

  const text = [
    { key: "serviceCallFee", label: labels.serviceCallFee, value: serviceCallFee, onChange: onServiceCallFee, placeholder: "$95" },
    { key: "hourlyRate", label: labels.hourlyRate, value: hourlyRate, onChange: onHourlyRate, placeholder: "$125/hr" },
    { key: "afterHours", label: labels.afterHoursSurcharge, value: afterHoursSurcharge, onChange: onAfterHoursSurcharge, placeholder: "$75" },
  ].filter((f) => f.label);

  return (
    <div className="space-y-3">
      <Label>Pricing</Label>
      <div className="grid gap-3 md:grid-cols-2">
        {text.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={f.key} className="text-sm text-muted-foreground">
              {f.label}
            </Label>
            <Input
              id={f.key}
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              placeholder={f.placeholder}
            />
          </div>
        ))}
        {labels.freeEstimates && (
          <div className="flex items-center gap-2 pt-5">
            <Input
              type="checkbox"
              id="freeEstimates"
              checked={freeEstimates}
              onChange={(e) => onFreeEstimates(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="freeEstimates" className="text-sm">
              {labels.freeEstimates}
            </Label>
          </div>
        )}
      </div>
    </div>
  );
}
