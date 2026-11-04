import type { IndustryProfile } from "./types";
import {
  CONSULTATION_PRICING_LABELS,
  NO_PRICING_LABELS,
  describeStep,
  immediateDangerRule,
} from "./shared";

// Confidential-tier businesses: the receptionist routes enquiries, never
// advises, and never takes account, ID, or payment details over the phone.

const AFTER_SAFETY_IF_SAFE =
  "After giving safety guidance, treat the call as an emergency and continue collecting their details if it is safe for them to keep talking.";

const NO_SENSITIVE_NUMBERS =
  "Never ask for or accept passwords, bank or card details, or government ID numbers over the phone.";

export const legal: IndustryProfile = {
  id: "legal",
  label: "Law firm",
  category: "Professional services",
  sensitivity: "confidential",

  businessDescription: "a law firm",
  captureList:
    "name, the type of legal matter, conflict-check details, any deadlines, and callback number",
  defaultServicesLabel: "General legal services",
  defaultServices: [
    { name: "Family law" },
    { name: "Personal injury" },
    { name: "Wills and estates" },
    { name: "Business law" },
    { name: "Real estate / property" },
  ],
  defaultEmergencyDefinition: (region) =>
    `Someone has just been arrested or is in custody, a court hearing or filing deadline is within the next 48 hours, or the caller needs an urgent protective or restraining order. If anyone is in immediate danger, advise the caller to call ${region.emergencyNumber} first.`,

  bookingNoun: "consultation",
  requestNounPlural: "matters",
  acceptanceDecision: "whether the firm can take on the matter",
  allowsLiveTransfer: true,

  pricingLabels: CONSULTATION_PRICING_LABELS,

  describeStep:
    "Collect the caller's name and a brief, high-level description of their legal matter. Let the caller explain in full, even if it takes several sentences with pauses, before you ask any follow-up question. You only need enough to route the matter — do not ask for detailed facts or evidence.",
  detailsStep: () =>
    "Ask what kind of matter it is (for example family, criminal, personal injury, estate, business, property, or immigration). For conflict checking, ask for the full names of any other people or organisations involved, such as the other party. Ask whether there is any upcoming court date or filing deadline, and note the exact date. Do not ask for a home address unless the caller offers it.",

  safetyRules: (region) => [
    `The caller or someone else is in immediate danger, including from domestic violence: tell them to call ${region.emergencyNumber} right now.`,
    "Someone has just been arrested or is being held in custody: treat it as an emergency and note where they are being held.",
  ],
  afterSafety: AFTER_SAFETY_IF_SAFE,
  guardrails: (region) => [
    `Never give legal advice, predict an outcome, or say whether the caller has a case. If asked, say that a ${region.lawyerTerm} will need to review the details.`,
    "Do not say or imply that the firm has agreed to represent the caller. Speaking with you does not make them a client.",
    "Treat everything the caller says as confidential. Never confirm or deny to anyone whether a person is, or was, a client of the firm.",
    "Do not quote fees other than those listed under PRICING.",
    "If the caller appears to be the other party in a matter the firm is already handling, take only their name and number and say someone will call them back.",
  ],

  issueSummaryDescription:
    "One or two sentences describing, at a high level, the legal matter or reason for the call. No detailed facts.",
  urgencyDescription:
    "How urgent the matter is. 'emergency' = someone in custody now, a hearing or deadline within 48 hours, or an urgent protective order; 'urgent' = a deadline within about a week; 'routine' = a general enquiry or consultation request; 'unknown' if unclear.",
  collectsServiceAddress: false,
  intakeFields: [
    {
      key: "matter_type",
      label: "Matter type",
      description:
        "The area of law, e.g. 'family', 'criminal', 'personal injury', 'estate', 'business', 'property', 'immigration'. Empty string if unclear.",
    },
    {
      key: "other_parties",
      label: "Other parties",
      description:
        "Full names of any other people or organisations involved (for the conflict check), comma-separated. Empty string if none given.",
    },
    {
      key: "key_deadline",
      label: "Key deadline",
      description:
        "Any court date or filing deadline the caller mentioned, as an ISO 8601 date (e.g. '2026-07-03') if a specific date was given, otherwise as they described it. Empty string if none.",
    },
  ],
};

export const accounting: IndustryProfile = {
  id: "accounting",
  label: "Accounting & tax",
  category: "Professional services",
  sensitivity: "confidential",

  businessDescription: "an accounting and tax firm",
  captureList:
    "name, whether they are an individual or a business, the service they need, any deadlines, and callback number",
  defaultServicesLabel: "General accounting and tax services",
  defaultServices: [
    { name: "Personal tax returns" },
    { name: "Business tax returns" },
    { name: "Bookkeeping" },
    { name: "Payroll" },
    { name: "Business advisory" },
  ],
  defaultEmergencyDefinition: () =>
    "A tax authority deadline, audit or enquiry letter with a response date, or a payroll deadline within the next few days.",

  bookingNoun: "consultation",
  requestNounPlural: "requests",
  acceptanceDecision: "how the firm can help",
  allowsLiveTransfer: true,

  pricingLabels: CONSULTATION_PRICING_LABELS,

  describeStep: describeStep(
    "what they need help with (for example a tax return, bookkeeping, payroll, or a letter from the tax authority)"
  ),
  detailsStep: () =>
    "Ask whether they are calling as an individual or for a business (and the business name if so), whether they are an existing client, and whether there is any upcoming deadline, such as a filing date or a response date on a letter. Note the exact date. Do not ask for tax ID numbers, account numbers, or income figures.",

  safetyRules: (region) => [immediateDangerRule(region)],
  afterSafety: AFTER_SAFETY_IF_SAFE,
  guardrails: () => [
    "Never give tax, accounting, or financial advice, or say what the caller owes or can claim. If asked, say an accountant will need to review their situation.",
    "Do not say or imply that the firm has agreed to take them on as a client.",
    "Treat everything the caller says as confidential. Never confirm or deny whether a person or business is a client of the firm.",
    NO_SENSITIVE_NUMBERS,
  ],

  issueSummaryDescription:
    "One or two sentences describing the service needed or reason for the call. No financial figures or ID numbers.",
  urgencyDescription:
    "How urgent the request is. 'emergency' = a tax authority, audit, or payroll deadline within a few days; 'urgent' = a deadline within about two weeks; 'routine' = general enquiries or new-client consultations; 'unknown' if unclear.",
  collectsServiceAddress: false,
  intakeFields: [
    {
      key: "client_type",
      label: "Client type",
      description: "'individual', 'business', or 'unknown'.",
      enum: ["individual", "business", "unknown"],
    },
    {
      key: "key_deadline",
      label: "Key deadline",
      description:
        "Any deadline the caller mentioned, as an ISO 8601 date if a specific date was given, otherwise as they described it. Empty string if none.",
    },
  ],
};

export const insurance: IndustryProfile = {
  id: "insurance",
  label: "Insurance agency",
  category: "Professional services",
  sensitivity: "confidential",

  businessDescription: "an insurance agency",
  captureList:
    "name, the type of insurance, whether it's a quote, policy question, or claim, and callback number",
  defaultServicesLabel: "General insurance",
  defaultServices: [
    { name: "Auto / car insurance" },
    { name: "Home and contents insurance" },
    { name: "Business insurance" },
    { name: "Life insurance" },
  ],
  defaultEmergencyDefinition: (region) =>
    `A claim for an accident, fire, flood, theft, or storm damage that has just happened, or a policy that is about to lapse. If anyone is hurt or in danger, advise the caller to call ${region.emergencyNumber} first.`,

  bookingNoun: "call with an agent",
  requestNounPlural: "requests",
  acceptanceDecision: "how the agency can help",
  allowsLiveTransfer: true,

  pricingLabels: NO_PRICING_LABELS,

  describeStep: describeStep(
    "whether they are calling about a new quote, an existing policy, or a claim"
  ),
  detailsStep: () =>
    "Ask what type of insurance it concerns (for example auto, home, business, or life) and whether they are an existing client. For a claim, ask briefly what happened and when. Do not ask for policy numbers, ID numbers, or payment details over the phone.",

  safetyRules: (region) => [
    `The caller has just had an accident, or there is a fire, flood, or break-in happening now: tell them to make sure everyone is safe first, and to call ${region.emergencyNumber} if anyone is hurt or in danger.`,
  ],
  afterSafety: AFTER_SAFETY_IF_SAFE,
  guardrails: () => [
    "Never confirm that something is covered, quote a binding price, or say a claim will be paid. A licensed agent will need to review it.",
    NO_SENSITIVE_NUMBERS,
    "Treat everything the caller says as confidential.",
  ],

  issueSummaryDescription:
    "One or two sentences describing the request (quote, policy question, or claim) and the type of insurance.",
  urgencyDescription:
    "How urgent the request is. 'emergency' = a loss that has just happened (accident, fire, flood, theft) or a policy about to lapse; 'urgent' = needs a reply within ~24h; 'routine' = quotes and general questions; 'unknown' if unclear.",
  collectsServiceAddress: false,
  intakeFields: [
    {
      key: "insurance_type",
      label: "Insurance type",
      description: "e.g. 'auto', 'home', 'business', 'life'. Empty string if unclear.",
    },
    {
      key: "request_type",
      label: "Request",
      description: "'quote', 'policy', 'claim', 'other', or 'unknown'.",
      enum: ["quote", "policy", "claim", "other", "unknown"],
    },
  ],
};

export const realEstate: IndustryProfile = {
  id: "real_estate",
  label: "Real estate agency",
  category: "Professional services",
  sensitivity: "standard",

  businessDescription: "a real estate agency",
  captureList:
    "name, whether they want to buy, sell, or rent, the property or area they're interested in, and callback number",
  defaultServicesLabel: "Property sales and rentals",
  defaultServices: [
    { name: "Buying" },
    { name: "Selling and appraisals" },
    { name: "Rentals and leasing" },
    { name: "Property management" },
  ],
  defaultEmergencyDefinition: () =>
    "Usually none. Treat an offer deadline, settlement or closing issue, or a viewing within the next 24 hours as urgent.",

  bookingNoun: "viewing",
  requestNounPlural: "enquiries",
  acceptanceDecision: "how the agency can help",
  allowsLiveTransfer: true,

  pricingLabels: NO_PRICING_LABELS,

  describeStep: describeStep(
    "whether they want to buy, sell, or rent a property, or are calling about a specific listing"
  ),
  detailsStep: () =>
    "Ask which property or area they're interested in (an address or listing reference if they have one), their price range if they're happy to share it, and their timeline. If they want to sell or rent out a property, ask for its address.",

  safetyRules: (region) => [immediateDangerRule(region)],
  afterSafety: AFTER_SAFETY_IF_SAFE,
  guardrails: () => [
    "Do not give valuations, negotiate prices, or make commitments on behalf of a seller or landlord. An agent will follow up.",
    "Never share other clients' offers or personal details.",
  ],

  issueSummaryDescription:
    "One or two sentences describing the enquiry (buy, sell, rent) and the property or area of interest.",
  urgencyDescription:
    "How urgent the enquiry is. 'emergency' is rarely used; 'urgent' = an offer deadline, settlement/closing issue, or viewing within ~24h; 'routine' = general enquiries; 'unknown' if unclear.",
  collectsServiceAddress: false,
  intakeFields: [
    {
      key: "enquiry_type",
      label: "Enquiry",
      description: "'buy', 'sell', 'rent', 'let', 'other', or 'unknown'.",
      enum: ["buy", "sell", "rent", "let", "other", "unknown"],
    },
    {
      key: "property_interest",
      label: "Property of interest",
      description:
        "The address, listing reference, or area the caller is interested in. Empty string if none.",
    },
  ],
};
