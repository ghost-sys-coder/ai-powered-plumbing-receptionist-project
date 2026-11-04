import {
  INDUSTRY_CATEGORIES,
  INDUSTRY_IDS,
  type IndustryCategory,
  type IndustryId,
  type IndustryProfile,
} from "./types";
import {
  applianceRepair,
  cleaning,
  electrical,
  garageDoor,
  hvac,
  landscaping,
  locksmith,
  pestControl,
  plumbing,
  roofing,
} from "./home-services";
import { autoRepair, propertyManagement } from "./property-auto";
import { clinic, dental, physiotherapy, veterinary } from "./health";
import { accounting, insurance, legal, realEstate } from "./professional";
import { general, salonSpa } from "./other";

export * from "./types";

// Existing customers predate the industry column and are plumbers.
export const DEFAULT_INDUSTRY: IndustryId = "plumbing";

// Typed as a full Record so adding an id to INDUSTRY_IDS without a profile is a
// compile error.
const INDUSTRIES: Record<IndustryId, IndustryProfile> = {
  plumbing,
  hvac,
  roofing,
  electrical,
  pest_control: pestControl,
  locksmith,
  garage_door: garageDoor,
  appliance_repair: applianceRepair,
  cleaning,
  landscaping,
  property_management: propertyManagement,
  auto_repair: autoRepair,
  clinic,
  dental,
  physiotherapy,
  veterinary,
  legal,
  accounting,
  insurance,
  real_estate: realEstate,
  salon_spa: salonSpa,
  general,
};

export function isIndustryId(value: unknown): value is IndustryId {
  return typeof value === "string" && (INDUSTRY_IDS as readonly string[]).includes(value);
}

export function getIndustry(id: string | null | undefined): IndustryProfile {
  return INDUSTRIES[isIndustryId(id) ? id : DEFAULT_INDUSTRY];
}

export function listIndustries(): IndustryProfile[] {
  return INDUSTRY_IDS.map((id) => INDUSTRIES[id]);
}

// For grouped <select> menus in onboarding.
export function listIndustriesByCategory(): Array<{
  category: IndustryCategory;
  industries: IndustryProfile[];
}> {
  return INDUSTRY_CATEGORIES.map((category) => ({
    category,
    industries: listIndustries().filter((p) => p.category === category),
  })).filter((g) => g.industries.length > 0);
}
