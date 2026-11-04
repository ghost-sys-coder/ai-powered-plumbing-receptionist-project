import { DEFAULT_INDUSTRY, isIndustryId, type IndustryId } from "@/lib/verticals";
import { DEFAULT_COUNTRY, isCountryCode, type CountryCode } from "@/lib/regions";

export interface ProfileFields {
  industry: IndustryId;
  country: CountryCode;
  businessDescription: string | null;
}

const MAX_DESCRIPTION = 120;

// Validates the industry/country/description sent by the admin forms.
// Unknown values are rejected rather than silently defaulted, so a typo can't
// give a law firm the plumbing prompt.
export function parseProfileInput(
  body: Record<string, unknown>
): { ok: true; value: ProfileFields } | { ok: false; error: string } {
  const industry = body.industry ?? DEFAULT_INDUSTRY;
  const country = body.country ?? DEFAULT_COUNTRY;

  if (!isIndustryId(industry)) {
    return { ok: false, error: `Unknown industry "${String(industry)}"` };
  }
  if (!isCountryCode(country)) {
    return { ok: false, error: `Unknown country "${String(country)}"` };
  }

  const raw = typeof body.businessDescription === "string" ? body.businessDescription.trim() : "";
  if (raw.length > MAX_DESCRIPTION) {
    return {
      ok: false,
      error: `Business description must be ${MAX_DESCRIPTION} characters or fewer`,
    };
  }
  if (industry === "general" && !raw) {
    return {
      ok: false,
      error: 'A business description is required for "Other / general business", e.g. "a dog grooming salon"',
    };
  }

  return { ok: true, value: { industry, country, businessDescription: raw || null } };
}

// Reads stored values back into typed profile fields. Stored values were
// validated on write; anything unexpected falls back to the defaults.
export function storedProfile(row: {
  industry?: string | null;
  country?: string | null;
  businessDescription?: string | null;
}): ProfileFields {
  return {
    industry: isIndustryId(row.industry) ? row.industry : DEFAULT_INDUSTRY,
    country: isCountryCode(row.country) ? row.country : DEFAULT_COUNTRY,
    businessDescription: row.businessDescription ?? null,
  };
}
