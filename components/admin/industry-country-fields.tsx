"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getIndustry,
  listIndustriesByCategory,
  type IndustryId,
} from "@/lib/verticals";
import { listRegions, type CountryCode } from "@/lib/regions";

type Props = {
  industry: IndustryId;
  country: CountryCode;
  businessDescription: string;
  onIndustryChange: (value: IndustryId) => void;
  onCountryChange: (value: CountryCode) => void;
  onBusinessDescriptionChange: (value: string) => void;
};

const GROUPS = listIndustriesByCategory();
const REGIONS = listRegions();

// Industry + country pickers shared by the create and edit customer forms.
// These choose the receptionist's prompt profile (lib/verticals, lib/regions).
export function IndustryCountryFields({
  industry,
  country,
  businessDescription,
  onIndustryChange,
  onCountryChange,
  onBusinessDescriptionChange,
}: Props) {
  const profile = getIndustry(industry);
  const descriptionRequired = industry === "general";

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="industry">Industry *</Label>
        <Select value={industry} onValueChange={(v) => onIndustryChange(v as IndustryId)}>
          <SelectTrigger id="industry">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUPS.map((group) => (
              <SelectGroup key={group.category}>
                <SelectLabel>{group.category}</SelectLabel>
                {group.industries.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {profile.sensitivity !== "standard" && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {profile.sensitivity === "health"
              ? "Health information — check privacy obligations (e.g. HIPAA, UK GDPR) before going live."
              : "Confidential matters — the receptionist won't give advice or take ID/bank details."}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="country">Country *</Label>
        <Select value={country} onValueChange={(v) => onCountryChange(v as CountryCode)}>
          <SelectTrigger id="country">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGIONS.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="businessDescription">
          What the business does {descriptionRequired ? "*" : "(optional)"}
        </Label>
        <Input
          id="businessDescription"
          value={businessDescription}
          onChange={(e) => onBusinessDescriptionChange(e.target.value)}
          placeholder={descriptionRequired ? "a dog grooming salon" : profile.businessDescription}
          maxLength={120}
          required={descriptionRequired}
        />
        <p className="text-xs text-muted-foreground">
          The receptionist says the business is &ldquo;
          {businessDescription.trim() || profile.businessDescription}&rdquo;. Start with
          &ldquo;a&rdquo; or &ldquo;an&rdquo;.
        </p>
      </div>
    </>
  );
}
