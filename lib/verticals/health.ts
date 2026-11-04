import type { IndustryProfile } from "./types";
import {
  NO_PRICING_LABELS,
  describeStep,
  noClinicalAdviceGuardrails,
  patientStatusField,
} from "./shared";

// Health information is regulated in every target market (HIPAA, PIPEDA and
// provincial health acts, UK GDPR special-category data, the Australian Privacy
// Act, Uganda's Data Protection and Privacy Act). Human-health profiles collect
// the minimum needed to book or pass on a message and never give advice.

const MINIMUM_NECESSARY =
  "Do not ask for detailed symptoms, medical history, medications, insurance numbers, or ID numbers — the practice will collect those directly. Do not ask for a home address.";

const LET_THEM_GO =
  "After giving this guidance, do not keep someone who needs emergency care on the line to collect details. Take only their name and callback number if they offer them, then let them go.";

export const clinic: IndustryProfile = {
  id: "clinic",
  label: "Medical clinic",
  category: "Health",
  sensitivity: "health",

  businessDescription: "a medical clinic",
  captureList:
    "name, whether they are a new or existing patient, the brief reason for calling, and callback number",
  defaultServicesLabel: "General medical appointments",
  defaultServices: [
    { name: "General consultation" },
    { name: "Follow-up appointment" },
    { name: "Vaccinations" },
    { name: "Health check-up" },
  ],
  defaultEmergencyDefinition: (region) =>
    `Chest pain, difficulty breathing, signs of stroke, severe bleeding, a seizure, loss of consciousness, a severe allergic reaction, or thoughts of suicide or self-harm. These are medical emergencies — tell the caller to hang up and call ${region.emergencyNumber} now. Do not book them an appointment instead.`,

  bookingNoun: "appointment",
  requestNounPlural: "requests",
  acceptanceDecision: "how the clinic can help",
  allowsLiveTransfer: false,

  pricingLabels: { ...NO_PRICING_LABELS, serviceCallFee: "Self-pay visit fee" },

  describeStep:
    "Collect the caller's name and the brief reason for their call or visit, in a few words (for example 'a check-up', 'a follow-up', 'a sore throat'). Let the caller finish speaking before you ask any follow-up question.",
  detailsStep: () =>
    `Ask whether they are a new or existing patient, and whether they have a preferred doctor or clinician. ${MINIMUM_NECESSARY}`,

  safetyRules: (region) => [
    `Chest pain, trouble breathing, signs of stroke (face drooping, arm weakness, slurred speech), severe bleeding, a seizure, loss of consciousness, or a severe allergic reaction: tell the caller to hang up and call ${region.emergencyNumber} now.`,
    `Thoughts of suicide or self-harm: stay calm and kind, and tell them to call ${region.emergencyNumber} if they are in immediate danger${region.crisisLine ? `, or to contact ${region.crisisLine}` : ""}.`,
  ],
  afterSafety: LET_THEM_GO,
  guardrails: () => noClinicalAdviceGuardrails("a clinician", "medical"),

  issueSummaryDescription:
    "A few words on the reason for the call or visit (e.g. 'check-up', 'follow-up', 'sore throat'). No detailed symptoms or medical history.",
  urgencyDescription:
    "How urgent the request is. 'emergency' = the caller described a medical emergency and was told to call the emergency number; 'urgent' = wants to be seen today or tomorrow; 'routine' = regular appointment or admin request; 'unknown' if unclear.",
  collectsServiceAddress: false,
  intakeFields: [
    patientStatusField(),
    {
      key: "preferred_provider",
      label: "Preferred clinician",
      description: "The doctor or clinician the caller asked for. Empty string if none.",
    },
  ],
};

export const dental: IndustryProfile = {
  id: "dental",
  label: "Dental practice",
  category: "Health",
  sensitivity: "health",

  businessDescription: "a dental practice",
  captureList:
    "name, whether they are a new or existing patient, the brief reason for calling, and callback number",
  defaultServicesLabel: "General dental care",
  defaultServices: [
    { name: "Check-up and clean" },
    { name: "Fillings" },
    { name: "Emergency dental appointments" },
    { name: "Teeth whitening" },
    { name: "Children's dentistry" },
  ],
  defaultEmergencyDefinition: (region) =>
    `A knocked-out adult tooth, facial swelling, bleeding that won't stop, or severe toothache. Swelling that affects breathing or swallowing, or a serious face or jaw injury — tell the caller to call ${region.emergencyNumber} or go to the nearest emergency department now.`,

  bookingNoun: "appointment",
  requestNounPlural: "requests",
  acceptanceDecision: "how the practice can help",
  allowsLiveTransfer: true,

  pricingLabels: { ...NO_PRICING_LABELS, serviceCallFee: "New patient exam fee" },

  describeStep:
    "Collect the caller's name and the brief reason for their call or visit, in a few words (for example 'a check-up', 'a broken tooth', 'toothache'). Let the caller finish speaking before you ask any follow-up question.",
  detailsStep: () =>
    `Ask whether they are a new or existing patient, and whether they have a preferred dentist. ${MINIMUM_NECESSARY}`,

  safetyRules: (region) => [
    `Swelling of the face or neck that makes it hard to breathe or swallow, bleeding that won't stop after firm pressure, or a serious injury to the face or jaw: tell them to call ${region.emergencyNumber} or go to the nearest emergency department now.`,
    "A knocked-out adult tooth: tell them to hold it by the crown (the white part), not the root, keep it moist in milk, and treat the call as an emergency — the sooner they are seen, the better.",
  ],
  afterSafety:
    "If the caller needs emergency care elsewhere, do not keep them on the line. Otherwise, treat the call as an emergency and continue collecting their details so they can be seen as soon as possible.",
  guardrails: () => noClinicalAdviceGuardrails("a dentist", "dental or medical"),

  issueSummaryDescription:
    "A few words on the reason for the call or visit (e.g. 'check-up', 'broken tooth', 'toothache'). No detailed medical history.",
  urgencyDescription:
    "How urgent the request is. 'emergency' = knocked-out tooth, facial swelling, uncontrolled bleeding, or severe pain; 'urgent' = pain or a broken tooth needing an appointment within ~24–48h; 'routine' = check-ups, cleans, or cosmetic work; 'unknown' if unclear.",
  collectsServiceAddress: false,
  intakeFields: [
    patientStatusField(),
    {
      key: "preferred_provider",
      label: "Preferred dentist",
      description: "The dentist the caller asked for. Empty string if none.",
    },
  ],
};

export const physiotherapy: IndustryProfile = {
  id: "physiotherapy",
  label: "Physiotherapy / chiropractic",
  category: "Health",
  sensitivity: "health",

  businessDescription: "a physiotherapy and rehabilitation clinic",
  captureList:
    "name, whether they are a new or existing patient, the brief reason for calling, and callback number",
  defaultServicesLabel: "Physiotherapy and rehabilitation",
  defaultServices: [
    { name: "Initial assessment" },
    { name: "Follow-up treatment" },
    { name: "Sports injury rehabilitation" },
    { name: "Massage therapy" },
  ],
  defaultEmergencyDefinition: (region) =>
    `Sudden severe back pain with numbness around the groin or buttocks, loss of bladder or bowel control, new leg weakness, chest pain, or a new injury with an obvious deformity. These need emergency care — tell the caller to call ${region.emergencyNumber} or go to an emergency department now.`,

  bookingNoun: "appointment",
  requestNounPlural: "requests",
  acceptanceDecision: "how the clinic can help",
  allowsLiveTransfer: false,

  pricingLabels: {
    ...NO_PRICING_LABELS,
    serviceCallFee: "Initial assessment fee",
  },

  describeStep:
    "Collect the caller's name and the brief reason for their visit, in a few words (for example 'lower back pain', 'a knee injury', 'a follow-up'). Let the caller finish speaking before you ask any follow-up question.",
  detailsStep: () =>
    `Ask whether they are a new or existing patient, whether they have a preferred practitioner, and whether the visit relates to a work injury or vehicle accident claim. ${MINIMUM_NECESSARY}`,

  safetyRules: (region) => [
    `Sudden severe back pain with numbness around the groin or buttocks, loss of bladder or bowel control, or new weakness in the legs; chest pain; or a new injury with an obvious deformity: tell them to call ${region.emergencyNumber} or go to an emergency department now.`,
  ],
  afterSafety: LET_THEM_GO,
  guardrails: () => noClinicalAdviceGuardrails("a practitioner", "medical or treatment"),

  issueSummaryDescription:
    "A few words on the reason for the visit (e.g. 'lower back pain', 'knee injury'). No detailed medical history.",
  urgencyDescription:
    "How urgent the request is. 'emergency' = the caller described red-flag symptoms and was told to seek emergency care; 'urgent' = wants to be seen within ~24–48h; 'routine' = regular appointment; 'unknown' if unclear.",
  collectsServiceAddress: false,
  intakeFields: [
    patientStatusField(),
    {
      key: "claim_type",
      label: "Claim",
      description:
        "If the visit relates to a claim: 'work_injury', 'vehicle_accident', or 'none'. 'unknown' if not discussed.",
      enum: ["work_injury", "vehicle_accident", "none", "unknown"],
    },
  ],
};

// The patient is an animal; the caller's own details are ordinary personal
// data, so this sits in the standard tier.
export const veterinary: IndustryProfile = {
  id: "veterinary",
  label: "Veterinary clinic",
  category: "Health",
  sensitivity: "standard",

  businessDescription: "a veterinary clinic",
  captureList: "name, their pet's name and species, the reason for calling, and callback number",
  defaultServicesLabel: "General veterinary care",
  defaultServices: [
    { name: "Wellness exams" },
    { name: "Vaccinations" },
    { name: "Dental care" },
    { name: "Desexing / spay and neuter" },
    { name: "Urgent care" },
  ],
  defaultEmergencyDefinition: () =>
    "Trouble breathing, collapse, seizures, heavy bleeding, suspected poisoning (for example chocolate, grapes, xylitol, rat bait, or antifreeze), being hit by a car, a swollen belly with retching in dogs, or a male cat straining to urinate. These need urgent veterinary care.",

  bookingNoun: "appointment",
  requestNounPlural: "requests",
  acceptanceDecision: "how the clinic can help",
  allowsLiveTransfer: true,

  pricingLabels: { ...NO_PRICING_LABELS, serviceCallFee: "Consultation fee" },

  describeStep: describeStep(
    "their pet's name and species, and the reason for their call"
  ),
  detailsStep: () =>
    "Ask whether they are a new or existing client of the clinic, and the pet's approximate age. Do not ask for a home address.",

  safetyRules: (region) => [
    "Trouble breathing, collapse, seizures, heavy bleeding, suspected poisoning (including chocolate, grapes, xylitol, rat bait, or antifreeze), being hit by a car, a swollen belly with retching in a dog, or a male cat straining to urinate: tell the caller this needs urgent veterinary care. If the clinic is open now (see BUSINESS HOURS), tell them to come in straight away; if it is closed, tell them to go to the nearest emergency vet hospital.",
    `A person has been bitten or injured by an animal, or is in danger: tell them to call ${region.emergencyNumber}.`,
  ],
  afterSafety:
    "After giving this guidance, treat the call as an emergency, confirm the caller's name and callback number, and alert the team.",
  guardrails: () => noClinicalAdviceGuardrails("a vet", "veterinary"),

  issueSummaryDescription:
    "One or two sentences on the pet and the reason for the call (e.g. 'Dog, Max — limping since yesterday').",
  urgencyDescription:
    "How urgent the request is. 'emergency' = a pet emergency such as breathing trouble, collapse, poisoning, or trauma; 'urgent' = needs to be seen today or tomorrow; 'routine' = wellness, vaccinations, or admin; 'unknown' if unclear.",
  collectsServiceAddress: false,
  intakeFields: [
    {
      key: "pet",
      label: "Pet",
      description: "The pet's name and species, e.g. 'Max (dog)'. Empty string if not given.",
    },
    patientStatusField("client"),
  ],
};

