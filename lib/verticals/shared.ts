import type { RegionProfile } from "@/lib/regions";
import type { IndustryProfile, IntakeField } from "./types";

// Building blocks shared by the industry profiles. To add an industry, prefer
// one of the factories below (tradeProfile for on-site services) and override
// only what differs; write a full IndustryProfile only when the call flow is
// genuinely different.

export function gasLeakRule(region: RegionProfile): string {
  if (region.gas.supply === "cylinder") {
    return `Gas smell or suspected gas leak: tell the caller to turn off the gas cylinder valve only if they can reach it safely, open doors and windows, leave the building now, and not to use light switches, phones, or flames inside. Tell them to call ${region.emergencyNumber} once they are outside if anyone is at risk.`;
  }
  return `Gas smell or suspected gas leak: tell the caller to leave the building now, not to use light switches, phones, or flames inside, and to call ${region.gas.emergencyContact} or ${region.emergencyNumber} once they are outside.`;
}

export function waterNearElectricsRule(region: RegionProfile): string {
  return `Water near electrical outlets, panels, or appliances: tell them to stay out of the water, not to touch anything electrical, and to call ${region.emergencyNumber} if anyone is at risk.`;
}

export function immediateDangerRule(region: RegionProfile): string {
  return `The caller or anyone else is hurt or in immediate danger: tell them to call ${region.emergencyNumber} right now.`;
}

export const DEFAULT_AFTER_SAFETY =
  "After giving safety guidance, treat the call as an emergency and continue collecting their details.";

// Step 2 for trades: let the caller describe the problem without interruption.
export function tradeDescribeStep(issue: string): string {
  return `Collect the caller's name and describe their ${issue}. Let the caller describe the issue in full, even if it takes several sentences with pauses, before you ask any follow-up question.`;
}

// Step 2 for everyone else: the same patience rule, with the request named.
export function describeStep(what: string): string {
  return `Collect the caller's name and ${what}. Let the caller explain in full, even if it takes several sentences with pauses, before you ask any follow-up question.`;
}

// Step 3 for trades: the service address is mandatory.
export function serviceAddressStep(region: RegionProfile): string {
  return `Always collect the full service address where the work is needed — ${region.address.parts}. Do not skip this; if the caller hasn't given it, ask for it directly: "What's the full address where you need the work done?" Read it back to confirm you have it right. Wait until the caller has finished saying the entire address before reading it back; do not read back or question a partial address while they are still speaking.`;
}

export const TRADE_PRICING_LABELS = {
  serviceCallFee: "Service call fee",
  hourlyRate: "Hourly rate",
  afterHoursSurcharge: "After-hours surcharge",
  freeEstimates: "Free estimates",
} as const;

export const CONSULTATION_PRICING_LABELS = {
  serviceCallFee: "Consultation fee",
  hourlyRate: "Hourly rate",
  afterHoursSurcharge: null,
  freeEstimates: "Free initial consultation",
} as const;

export const NO_PRICING_LABELS = {
  serviceCallFee: null,
  hourlyRate: null,
  afterHoursSurcharge: null,
  freeEstimates: null,
} as const;

// Health-type guardrails, parameterised by who gives advice ("a clinician",
// "a dentist", "a vet").
export function noClinicalAdviceGuardrails(adviser: string, subject: string): string[] {
  return [
    `Never diagnose, give ${subject} advice, suggest medication or doses, or say whether symptoms sound serious. If asked, say ${adviser} will need to advise.`,
    "Do not discuss test results, prescriptions, or anyone else's information. For results or prescription refills, take a message.",
    "Collect only what is needed to book or pass on a message. Do not repeat sensitive details back more than needed to confirm them.",
  ];
}

export function patientStatusField(noun = "patient"): IntakeField {
  return {
    key: "patient_status",
    label: `${noun[0].toUpperCase()}${noun.slice(1)} status`,
    description: `'new' or 'existing' ${noun}, or 'unknown' if not stated.`,
    enum: ["new", "existing", "unknown"],
  };
}

// On-site trade businesses (plumbers, electricians, roofers…): the caller
// describes a problem at a property, the service address is mandatory, and
// the business sends someone out.
export interface TradeOptions {
  id: IndustryProfile["id"];
  label: string;
  businessDescription: string;
  // "describe their <issue>", e.g. "plumbing issue".
  issue: string;
  defaultServicesLabel: string;
  defaultServices: IndustryProfile["defaultServices"];
  defaultEmergencyDefinition: IndustryProfile["defaultEmergencyDefinition"];
  safetyRules: IndustryProfile["safetyRules"];
  issueSummaryDescription: string;
  urgencyDescription: string;
  intakeFields?: IntakeField[];
  // Optional overrides of the trade defaults.
  captureList?: string;
  bookingNoun?: string;
  guardrails?: IndustryProfile["guardrails"];
  detailsStep?: IndustryProfile["detailsStep"];
  category?: IndustryProfile["category"];
  requestNounPlural?: string;
}

export function tradeProfile(o: TradeOptions): IndustryProfile {
  return {
    id: o.id,
    label: o.label,
    category: o.category ?? "Home services",
    sensitivity: "standard",
    businessDescription: o.businessDescription,
    captureList: o.captureList ?? "name, issue, service address, and callback number",
    defaultServicesLabel: o.defaultServicesLabel,
    defaultServices: o.defaultServices,
    defaultEmergencyDefinition: o.defaultEmergencyDefinition,
    bookingNoun: o.bookingNoun ?? "visit",
    requestNounPlural: o.requestNounPlural ?? "jobs",
    acceptanceDecision: "whether to take the job",
    allowsLiveTransfer: true,
    pricingLabels: TRADE_PRICING_LABELS,
    describeStep: tradeDescribeStep(o.issue),
    detailsStep: o.detailsStep ?? serviceAddressStep,
    safetyRules: o.safetyRules,
    afterSafety: DEFAULT_AFTER_SAFETY,
    guardrails: o.guardrails ?? (() => []),
    issueSummaryDescription: o.issueSummaryDescription,
    urgencyDescription: o.urgencyDescription,
    collectsServiceAddress: true,
    intakeFields: o.intakeFields ?? [],
  };
}
