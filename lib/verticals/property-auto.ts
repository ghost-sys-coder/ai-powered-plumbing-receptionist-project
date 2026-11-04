import type { IndustryProfile } from "./types";
import {
  TRADE_PRICING_LABELS,
  gasLeakRule,
  tradeDescribeStep,
  tradeProfile,
  waterNearElectricsRule,
} from "./shared";

// Tenants calling about their home. Trade-like (someone is sent out), but the
// unit number matters and the manager can't make lease decisions by phone.
export const propertyManagement = tradeProfile({
  id: "property_management",
  label: "Property management",
  category: "Property & automotive",
  businessDescription: "a property management company",
  issue: "maintenance issue or reason for calling",
  captureList:
    "name, the property address and unit, the maintenance issue or reason for calling, and callback number",
  requestNounPlural: "requests",
  defaultServicesLabel: "Residential property management",
  defaultServices: [
    { name: "Maintenance requests" },
    { name: "Rental enquiries and viewings" },
    { name: "Lease and tenancy questions" },
  ],
  defaultEmergencyDefinition: (region) =>
    `Flooding or a major leak, no heat in freezing weather, a gas smell, a fire, sewage backing up, no power or water to the unit, or a door that can't be locked. Gas smells, fire, or anyone in danger — advise the caller to call ${region.emergencyNumber} first.`,
  detailsStep: (region) =>
    `Always collect the full address of the property — ${region.address.parts} — and the unit or apartment number. Ask whether they are a tenant, an owner, or someone looking to rent. Read the address and unit back to confirm. Wait until the caller has finished saying the entire address before reading it back.`,
  safetyRules: (region) => [
    gasLeakRule(region),
    `Fire or smoke: tell them to get everyone out of the building and call ${region.emergencyNumber} now.`,
    waterNearElectricsRule(region),
    "If it is safe to do so, suggest shutting off the water supply to the unit to limit damage from a leak.",
  ],
  guardrails: () => [
    "Do not make decisions about rent, deposits, lease terms, evictions, or whether a repair will be paid for. Take a message for the property manager.",
  ],
  issueSummaryDescription:
    "One or two sentences describing the maintenance issue or reason for the call.",
  urgencyDescription:
    "How urgent the request is. 'emergency' = flooding, gas, fire, sewage, no heat in freezing weather, no power/water, or a door that won't lock; 'urgent' = a repair needed within ~24–48h; 'routine' = non-urgent repairs, enquiries, or viewings; 'unknown' if unclear.",
  intakeFields: [
    {
      key: "unit_number",
      label: "Unit",
      description: "The unit or apartment number. Empty string if not given.",
    },
    {
      key: "caller_role",
      label: "Caller",
      description:
        "Who is calling: 'tenant', 'owner', 'prospective_tenant', 'other', or 'unknown' if unclear.",
      enum: ["tenant", "owner", "prospective_tenant", "other", "unknown"],
    },
  ],
});

export const autoRepair: IndustryProfile = {
  id: "auto_repair",
  label: "Auto repair",
  category: "Property & automotive",
  sensitivity: "standard",

  businessDescription: "an auto repair shop",
  captureList: "name, the vehicle's make, model, and year, the issue, and callback number",
  defaultServicesLabel: "General vehicle servicing and repairs",
  defaultServices: [
    { name: "Servicing and oil changes" },
    { name: "Brake repair" },
    { name: "Diagnostics" },
    { name: "Tyres and wheel alignment" },
    { name: "Inspections" },
  ],
  defaultEmergencyDefinition: (region) =>
    `A vehicle that has broken down somewhere unsafe, brake or steering failure, smoke, or a fuel smell. If the caller has had an accident or is stranded somewhere dangerous, advise them to get to safety and call ${region.emergencyNumber} if anyone is hurt.`,

  bookingNoun: "appointment",
  requestNounPlural: "jobs",
  acceptanceDecision: "whether to take the job",
  allowsLiveTransfer: true,

  pricingLabels: {
    ...TRADE_PRICING_LABELS,
    serviceCallFee: "Diagnostic fee",
    hourlyRate: "Labour rate",
    freeEstimates: "Free quotes",
  },

  describeStep: tradeDescribeStep("vehicle issue"),
  detailsStep: () =>
    "Ask for the vehicle's make, model, and year. Ask whether it can be driven. If it can't, ask where it is now so the shop can arrange towing. Do not ask for a home address otherwise.",

  safetyRules: (region) => [
    `The caller has just had an accident, or is broken down on a busy road: tell them to get themselves and passengers to a safe place away from traffic, and to call ${region.emergencyNumber} if anyone is hurt or in danger.`,
    "Brake failure, steering problems, smoke, or a fuel smell: tell them not to drive the vehicle.",
  ],
  afterSafety:
    "After giving safety guidance, treat the call as an emergency and continue collecting their details once they are somewhere safe.",
  guardrails: () => [
    "Do not diagnose the fault or quote repair prices other than those listed under PRICING. A technician will need to inspect the vehicle.",
  ],

  issueSummaryDescription:
    "One or two sentences describing the vehicle problem or reason for the call.",
  urgencyDescription:
    "How urgent the job is. 'emergency' = broken down somewhere unsafe, or brake/steering failure, smoke, or fuel smell; 'urgent' = vehicle not drivable or needed within ~24h; 'routine' = servicing, inspections, or quotes; 'unknown' if unclear.",
  collectsServiceAddress: false,
  intakeFields: [
    {
      key: "vehicle",
      label: "Vehicle",
      description: "Make, model, and year, e.g. '2018 Toyota Camry'. Empty string if not given.",
    },
    {
      key: "drivable",
      label: "Drivable",
      description: "Whether the vehicle can be driven: 'yes', 'no', or 'unknown'.",
      enum: ["yes", "no", "unknown"],
    },
  ],
};
