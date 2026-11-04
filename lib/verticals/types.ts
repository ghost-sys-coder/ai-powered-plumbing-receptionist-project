import type { RegionProfile } from "@/lib/regions";

export const INDUSTRY_IDS = [
  // Home services
  "plumbing",
  "hvac",
  "roofing",
  "electrical",
  "pest_control",
  "locksmith",
  "garage_door",
  "appliance_repair",
  "cleaning",
  "landscaping",
  // Property & automotive
  "property_management",
  "auto_repair",
  // Health
  "clinic",
  "dental",
  "physiotherapy",
  "veterinary",
  // Professional services
  "legal",
  "accounting",
  "insurance",
  "real_estate",
  // Personal services
  "salon_spa",
  // Anything not covered above — the business describes itself.
  "general",
] as const;
export type IndustryId = (typeof INDUSTRY_IDS)[number];

export const INDUSTRY_CATEGORIES = [
  "Home services",
  "Property & automotive",
  "Health",
  "Professional services",
  "Personal services",
  "Other",
] as const;
export type IndustryCategory = (typeof INDUSTRY_CATEGORIES)[number];

// How sensitive the information callers share is. Drives defaults for call
// recording / transcript retention and which guardrails apply.
//   standard     — ordinary contact and job details
//   confidential — legal, financial or insurance matters
//   health       — human health information (regulated in every market)
export type SensitivityTier = "standard" | "confidential" | "health";

// An extra value pulled out of each call for this industry, stored alongside
// the core call fields. Flat string fields only, so every voice provider's
// extraction format can express them.
export interface IntakeField {
  key: string;
  label: string;
  description: string;
  enum?: readonly string[];
}

export interface IndustryProfile {
  id: IndustryId;
  label: string;
  category: IndustryCategory;
  sensitivity: SensitivityTier;

  // "You are the AI receptionist for X, <businessDescription> serving Y."
  // A business can override this (required for "general").
  businessDescription: string;
  // "…capture the caller's <captureList>, assess urgency…"
  captureList: string;
  // Fallback line when no services are configured.
  defaultServicesLabel: string;
  defaultServices: Array<{ name: string; price?: string }>;
  defaultEmergencyDefinition: (region: RegionProfile) => string;

  // What a booking is called ("schedule a <bookingNoun>").
  bookingNoun: string;
  // "Urgent <requestNounPlural> still get booked…"
  requestNounPlural: string;
  // "<owner> will determine <acceptanceDecision> after reviewing the call."
  acceptanceDecision: string;
  // Whether the AI may offer a live transfer to the owner on emergencies. Off
  // where the right move is to send the caller to emergency services instead.
  allowsLiveTransfer: boolean;

  // Pricing labels; null hides the line for industries where it doesn't apply.
  pricingLabels: {
    serviceCallFee: string | null;
    hourlyRate: string | null;
    afterHoursSurcharge: string | null;
    freeEstimates: string | null;
  };

  // Instruction steps 2 and 3: describe the request, then the industry's
  // key details (service address, conflict-check info, patient status…).
  describeStep: string;
  detailsStep: (region: RegionProfile) => string;

  // SAFETY FIRST bullets (without the leading "- ").
  safetyRules: (region: RegionProfile) => string[];
  // Final safety bullet: what to do after giving safety guidance.
  afterSafety: string;
  // BOUNDARIES bullets — things the receptionist must never do. Empty for
  // industries that need none.
  guardrails: (region: RegionProfile) => string[];

  // Call-data extraction.
  issueSummaryDescription: string;
  urgencyDescription: string;
  // Whether the service address is a core field for this industry.
  collectsServiceAddress: boolean;
  intakeFields: IntakeField[];
}
