import type { IndustryProfile } from "./types";
import {
  DEFAULT_AFTER_SAFETY,
  NO_PRICING_LABELS,
  describeStep,
  immediateDangerRule,
} from "./shared";

export const salonSpa: IndustryProfile = {
  id: "salon_spa",
  label: "Salon & spa",
  category: "Personal services",
  sensitivity: "standard",

  businessDescription: "a salon and spa",
  captureList: "name, the service they'd like, any preferred stylist or therapist, and callback number",
  defaultServicesLabel: "Hair, beauty, and spa treatments",
  defaultServices: [
    { name: "Haircuts and styling" },
    { name: "Colour" },
    { name: "Nails" },
    { name: "Massage" },
    { name: "Facials" },
  ],
  defaultEmergencyDefinition: () =>
    "Usually none. Treat a reaction or problem after a recent treatment as urgent and alert the owner.",

  bookingNoun: "appointment",
  requestNounPlural: "requests",
  acceptanceDecision: "how the team can help",
  allowsLiveTransfer: true,

  pricingLabels: NO_PRICING_LABELS,

  describeStep: describeStep(
    "which service they'd like to book (for example a haircut, colour, nails, massage, or facial)"
  ),
  detailsStep: () =>
    "Ask whether they are a new or returning client, and whether they have a preferred stylist or therapist. Do not ask for a home address.",

  safetyRules: (region) => [
    `A reaction to a recent treatment with swelling of the face, lips, or throat, or trouble breathing: tell them to call ${region.emergencyNumber} now.`,
  ],
  afterSafety: DEFAULT_AFTER_SAFETY,
  guardrails: () => [
    "Do not give medical or skin-care advice about reactions or conditions. Take a message for the team.",
  ],

  issueSummaryDescription: "The service the caller wants, or the reason for the call.",
  urgencyDescription:
    "How urgent the request is. 'emergency' is rarely used; 'urgent' = a reaction or problem after a treatment, or an appointment needed today; 'routine' = regular bookings; 'unknown' if unclear.",
  collectsServiceAddress: false,
  intakeFields: [
    {
      key: "preferred_staff",
      label: "Preferred stylist / therapist",
      description: "The staff member the caller asked for. Empty string if none.",
    },
  ],
};

// Fallback for any business without a dedicated profile. The business's own
// description (PromptConfig.businessDescription, e.g. "a dog grooming salon")
// replaces the generic one, and its configured services and emergency
// definition carry the specifics.
export const general: IndustryProfile = {
  id: "general",
  label: "Other / general business",
  category: "Other",
  sensitivity: "standard",

  businessDescription: "a local business",
  captureList: "name, the reason for their call, and callback number",
  defaultServicesLabel: "General enquiries",
  defaultServices: [],
  defaultEmergencyDefinition: () =>
    "Anything the caller describes as urgent that affects their safety, health, or property, or needs a response today.",

  bookingNoun: "appointment",
  requestNounPlural: "requests",
  acceptanceDecision: "how the business can help",
  allowsLiveTransfer: true,

  pricingLabels: {
    ...NO_PRICING_LABELS,
    serviceCallFee: "Call-out / consultation fee",
    hourlyRate: "Hourly rate",
  },

  describeStep: describeStep("the reason for their call"),
  detailsStep: (region) =>
    `Ask the follow-up questions needed to understand what they need, using the services listed below as a guide. If the service is delivered at the caller's location, collect the full address — ${region.address.parts} — and read it back to confirm. Otherwise, do not ask for an address.`,

  safetyRules: (region) => [immediateDangerRule(region)],
  afterSafety: DEFAULT_AFTER_SAFETY,
  guardrails: () => [
    "Do not give professional advice (legal, medical, financial, or technical) or make commitments on behalf of the business. Take a message instead.",
  ],

  issueSummaryDescription: "One or two sentences describing the reason for the call.",
  urgencyDescription:
    "How urgent the request is. 'emergency' = a safety, health, or property emergency; 'urgent' = needs a response within ~24h; 'routine' = general enquiries or bookings; 'unknown' if unclear.",
  collectsServiceAddress: false,
  intakeFields: [],
};
