import { tradeProfile, gasLeakRule, waterNearElectricsRule } from "./shared";

// On-site trades. Safety text is read to callers in emergencies — keep it
// specific, conservative, and never ask callers to do anything risky.

// The original vertical. For US customers this profile must reproduce the
// pre-multi-industry prompt exactly — existing assistants depend on it.
export const plumbing = tradeProfile({
  id: "plumbing",
  label: "Plumbing",
  businessDescription: "a licensed plumbing company",
  issue: "plumbing issue",
  defaultServicesLabel: "General plumbing services",
  defaultServices: [
    { name: "Leak repair" },
    { name: "Drain cleaning" },
    { name: "Water heater repair and installation" },
    { name: "Toilet and faucet repair" },
  ],
  defaultEmergencyDefinition: (region) =>
    `Active water damage, burst pipe, sewage backup, or complete loss of water service. Gas line issues are emergencies — advise caller to call ${region.emergencyNumber} first.`,
  safetyRules: (region) => [
    gasLeakRule(region),
    waterNearElectricsRule(region),
    `Sewage backing up inside, or anyone hurt or in danger: tell them to keep everyone away from the affected area and to call ${region.emergencyNumber} if anyone is hurt.`,
    "If it is safe to do so, suggest shutting off the main water valve to limit damage.",
  ],
  issueSummaryDescription:
    "One or two sentences describing the plumbing problem or reason for the call.",
  urgencyDescription:
    "How urgent the job is. 'emergency' = active flooding/no water/gas/sewage now; 'urgent' = needs attention within ~24h; 'routine' = can be scheduled normally; 'unknown' if unclear.",
});

export const hvac = tradeProfile({
  id: "hvac",
  label: "HVAC (heating & cooling)",
  businessDescription: "a licensed heating and cooling (HVAC) company",
  issue: "heating or cooling issue",
  defaultServicesLabel: "General heating and cooling services",
  defaultServices: [
    { name: "Furnace and boiler repair" },
    { name: "Air conditioning repair" },
    { name: "Heat pump service" },
    { name: "Seasonal maintenance and tune-ups" },
    { name: "New system installation" },
  ],
  defaultEmergencyDefinition: (region) =>
    `No heat in freezing weather or no cooling in extreme heat (especially with elderly people, infants, or anyone unwell at home), a gas smell, a carbon monoxide alarm, or smoke or burning smells from the system. Gas smells and carbon monoxide alarms — tell the caller to leave the building and call ${region.emergencyNumber} first.`,
  safetyRules: (region) => [
    gasLeakRule(region),
    `Carbon monoxide alarm sounding, or headaches, dizziness, or nausea that ease when they go outside: tell everyone to leave the building immediately, not to go back in, and to call ${region.emergencyNumber} once they are outside.`,
    `Smoke, sparks, or a burning smell from the furnace, boiler, or air conditioner: tell them to switch the system off at the thermostat — and at the breaker only if they can do so safely — and to call ${region.emergencyNumber} if there is smoke or fire.`,
    "No heat in freezing weather, or no cooling in extreme heat, with elderly people, infants, or anyone unwell in the home: treat it as an emergency.",
  ],
  issueSummaryDescription:
    "One or two sentences describing the heating or cooling problem or reason for the call.",
  urgencyDescription:
    "How urgent the job is. 'emergency' = gas smell, carbon monoxide alarm, smoke from the system, or no heat/cooling in dangerous temperatures; 'urgent' = system down and needs attention within ~24h; 'routine' = maintenance, quotes, or can be scheduled normally; 'unknown' if unclear.",
  intakeFields: [
    {
      key: "system_type",
      label: "System type",
      description:
        "The equipment involved, e.g. 'furnace', 'boiler', 'central AC', 'heat pump', 'mini-split'. Empty string if not mentioned.",
    },
  ],
});

export const roofing = tradeProfile({
  id: "roofing",
  label: "Roofing",
  businessDescription: "a licensed roofing company",
  issue: "roofing issue",
  captureList: "name, issue, property address, and callback number",
  bookingNoun: "inspection",
  defaultServicesLabel: "General roofing services",
  defaultServices: [
    { name: "Roof leak repair" },
    { name: "Storm damage repair" },
    { name: "Emergency tarping" },
    { name: "Roof inspection" },
    { name: "Roof replacement" },
    { name: "Gutter repair" },
  ],
  defaultEmergencyDefinition: (region) =>
    `Water actively coming through the roof or ceiling, storm or tree damage that has opened the roof, or a sagging ceiling. If anyone is hurt or the structure looks unsafe, advise the caller to call ${region.emergencyNumber} first.`,
  safetyRules: (region) => [
    `Ceiling sagging, cracking, or bulging with water, or a tree or debris has come through the roof: tell them to keep everyone out of the area underneath, and to call ${region.emergencyNumber} if anyone is hurt or the building looks unsafe.`,
    `Water near electrical outlets, light fittings, or panels: tell them to stay out of the water, not to touch anything electrical, and to call ${region.emergencyNumber} if anyone is at risk.`,
    "Tell callers never to climb onto the roof themselves, especially during or right after a storm.",
    "If it is safe to do so, suggest moving belongings away from the leak and catching the water in buckets.",
  ],
  issueSummaryDescription:
    "One or two sentences describing the roofing problem or reason for the call.",
  urgencyDescription:
    "How urgent the job is. 'emergency' = water actively coming in, storm or tree damage opening the roof, or a sagging ceiling; 'urgent' = damage that needs attention within ~24h; 'routine' = inspections, quotes, or can be scheduled normally; 'unknown' if unclear.",
  intakeFields: [
    {
      key: "insurance_claim",
      label: "Insurance claim",
      description:
        "Whether the caller mentioned an insurance claim for this damage: 'yes', 'no', or 'unknown' if not discussed.",
      enum: ["yes", "no", "unknown"],
    },
  ],
});

export const electrical = tradeProfile({
  id: "electrical",
  label: "Electrical",
  businessDescription: "a licensed electrical contractor",
  issue: "electrical issue",
  defaultServicesLabel: "General electrical services",
  defaultServices: [
    { name: "Fault finding and repairs" },
    { name: "Outlet and switch installation" },
    { name: "Panel / fuse box upgrades" },
    { name: "Lighting installation" },
    { name: "EV charger installation" },
  ],
  defaultEmergencyDefinition: (region) =>
    `Sparks, smoke, or burning smells from wiring, outlets, or the panel; exposed live wires; a total loss of power that isn't a utility outage; or anyone who has had an electric shock. Fire, smoke, or injury — advise the caller to call ${region.emergencyNumber} first.`,
  safetyRules: (region) => [
    `Sparks, smoke, a burning smell, or scorch marks at an outlet, switch, or panel: tell them to keep away from it, switch off the power at the main breaker only if they can do so safely without touching anything wet or hot, and call ${region.emergencyNumber} if there is smoke or fire.`,
    `Someone has had an electric shock: tell them not to touch the person if they may still be in contact with the electricity, to switch the power off only if it is safe, and to call ${region.emergencyNumber} now.`,
    `Fallen or damaged power lines outside: tell them to stay well away, keep others away, and call the electricity network's emergency line or ${region.emergencyNumber}.`,
    waterNearElectricsRule(region),
  ],
  issueSummaryDescription:
    "One or two sentences describing the electrical problem or reason for the call.",
  urgencyDescription:
    "How urgent the job is. 'emergency' = sparks, smoke, burning smells, exposed wires, shock, or full loss of power; 'urgent' = partial loss of power or a fault that needs attention within ~24h; 'routine' = installations, upgrades, or quotes; 'unknown' if unclear.",
});

export const pestControl = tradeProfile({
  id: "pest_control",
  label: "Pest control",
  businessDescription: "a licensed pest control company",
  issue: "pest problem",
  bookingNoun: "inspection",
  defaultServicesLabel: "General pest control services",
  defaultServices: [
    { name: "Rodent control" },
    { name: "Ant and cockroach treatment" },
    { name: "Wasp and bee nest removal" },
    { name: "Bed bug treatment" },
    { name: "Termite inspection" },
  ],
  defaultEmergencyDefinition: (region) =>
    `A wasp, hornet, or bee nest near an entrance or where someone is allergic; a snake inside the home; or a pest problem forcing a food business to stay closed. Severe allergic reactions or suspected poisoning — advise the caller to call ${region.emergencyNumber} first.`,
  safetyRules: (region) => [
    `A sting followed by swelling of the face or throat, trouble breathing, or dizziness: tell them to call ${region.emergencyNumber} now.`,
    `A child, adult, or pet may have swallowed pesticide or bait: tell them to call ${region.emergencyNumber} or a poison information line now.`,
    "A snake inside the home or yard: tell them to keep everyone and any pets away from it and not to try to catch or kill it.",
  ],
  guardrails: () => [
    "Do not recommend pesticides, chemicals, doses, or do-it-yourself treatments. A technician will advise after an inspection.",
  ],
  issueSummaryDescription:
    "One or two sentences describing the pest problem or reason for the call.",
  urgencyDescription:
    "How urgent the job is. 'emergency' = stinging-insect nest near people (especially anyone allergic), a snake indoors, or a food business unable to open; 'urgent' = an active infestation needing treatment within ~24–48h; 'routine' = inspections, prevention, or quotes; 'unknown' if unclear.",
  intakeFields: [
    {
      key: "pest_type",
      label: "Pest",
      description:
        "The pest involved, e.g. 'rats', 'mice', 'ants', 'cockroaches', 'wasps', 'bed bugs', 'termites'. Empty string if unclear.",
    },
  ],
});

export const locksmith = tradeProfile({
  id: "locksmith",
  label: "Locksmith",
  businessDescription: "a licensed locksmith",
  issue: "lock or key problem",
  defaultServicesLabel: "General locksmith services",
  defaultServices: [
    { name: "Home lockouts" },
    { name: "Car lockouts" },
    { name: "Lock changes and rekeying" },
    { name: "Lock repair after a break-in" },
    { name: "Key cutting" },
  ],
  defaultEmergencyDefinition: (region) =>
    `Locked out of a home, business, or vehicle; a door that can't be secured after a break-in; or a child, vulnerable person, or pet locked inside. If anyone is in danger, advise the caller to call ${region.emergencyNumber} first.`,
  safetyRules: (region) => [
    `A child, vulnerable person, or pet is locked inside a car or building, especially in hot weather: tell them to call ${region.emergencyNumber} now if anyone may be in danger.`,
    `Signs of a break-in, or the caller thinks someone may still be inside: tell them not to go in, to move somewhere safe, and to call ${region.emergencyNumber}.`,
  ],
  guardrails: () => [
    "For lockouts, ask the caller to confirm they live at, own, or are authorised to enter the property or vehicle, and tell them the technician will need to see ID on arrival.",
  ],
  issueSummaryDescription:
    "One or two sentences describing the lock or key problem or reason for the call.",
  urgencyDescription:
    "How urgent the job is. 'emergency' = lockout now, someone locked inside, or a property that can't be secured after a break-in; 'urgent' = needed within ~24h; 'routine' = lock changes, upgrades, or key cutting; 'unknown' if unclear.",
  intakeFields: [
    {
      key: "job_type",
      label: "Job type",
      description:
        "What it's for: 'home', 'vehicle', 'business', or 'other'. Empty string if unclear.",
    },
  ],
});

export const garageDoor = tradeProfile({
  id: "garage_door",
  label: "Garage doors",
  businessDescription: "a garage door repair and installation company",
  issue: "garage door problem",
  defaultServicesLabel: "General garage door services",
  defaultServices: [
    { name: "Spring replacement" },
    { name: "Opener repair and installation" },
    { name: "Off-track door repair" },
    { name: "New door installation" },
  ],
  defaultEmergencyDefinition: (region) =>
    `A door stuck open so the property can't be secured, a car trapped inside, a broken spring, or a door that has come off its tracks or fallen. If anyone is hurt or trapped, advise the caller to call ${region.emergencyNumber} first.`,
  safetyRules: (region) => [
    `Broken spring, a door hanging off its tracks, or a door that has fallen: tell them not to try to open, close, or lift the door themselves, to keep children and pets away, and to call ${region.emergencyNumber} if anyone is hurt or trapped.`,
  ],
  issueSummaryDescription:
    "One or two sentences describing the garage door problem or reason for the call.",
  urgencyDescription:
    "How urgent the job is. 'emergency' = door stuck open, car trapped, broken spring, or door off its tracks; 'urgent' = door not working and needed within ~24h; 'routine' = servicing, upgrades, or quotes; 'unknown' if unclear.",
});

export const applianceRepair = tradeProfile({
  id: "appliance_repair",
  label: "Appliance repair",
  businessDescription: "an appliance repair company",
  issue: "appliance problem",
  defaultServicesLabel: "General appliance repair",
  defaultServices: [
    { name: "Washer and dryer repair" },
    { name: "Refrigerator and freezer repair" },
    { name: "Oven, stove, and cooktop repair" },
    { name: "Dishwasher repair" },
  ],
  defaultEmergencyDefinition: (region) =>
    `A gas appliance that smells of gas, smoke or sparks from an appliance, or an appliance leaking water. Gas smells or fire — advise the caller to call ${region.emergencyNumber} first.`,
  safetyRules: (region) => [
    gasLeakRule(region),
    `Smoke, sparks, or a burning smell from an appliance: tell them to keep away from it, unplug it or switch it off at the breaker only if they can do so safely, and call ${region.emergencyNumber} if there is smoke or fire.`,
    waterNearElectricsRule(region),
  ],
  issueSummaryDescription:
    "One or two sentences describing the appliance problem or reason for the call.",
  urgencyDescription:
    "How urgent the job is. 'emergency' = gas smell, smoke, sparks, or water leaking; 'urgent' = an essential appliance (fridge, freezer, cooker) not working; 'routine' = other repairs or servicing; 'unknown' if unclear.",
  intakeFields: [
    {
      key: "appliance",
      label: "Appliance",
      description:
        "The appliance and brand if given, e.g. 'Samsung washer', 'Bosch dishwasher'. Empty string if unclear.",
    },
  ],
});

export const cleaning = tradeProfile({
  id: "cleaning",
  label: "Cleaning services",
  businessDescription: "a professional cleaning company",
  issue: "cleaning needs",
  captureList: "name, the type of cleaning needed, the property address, and callback number",
  bookingNoun: "cleaning",
  requestNounPlural: "requests",
  defaultServicesLabel: "General cleaning services",
  defaultServices: [
    { name: "Regular home cleaning" },
    { name: "Deep cleaning" },
    { name: "Move-in / move-out cleaning" },
    { name: "Office cleaning" },
  ],
  defaultEmergencyDefinition: () =>
    "Usually none. Treat flood or sewage clean-up, or cleaning that must be done within 24 hours (for example before a move-out inspection), as urgent.",
  safetyRules: (region) => [
    `The caller or anyone else is hurt or in danger: tell them to call ${region.emergencyNumber} right now.`,
    "If the caller mentions sewage, large areas of mould, or blood or other biohazards, note it — these need specialist cleaning and the team will advise.",
  ],
  issueSummaryDescription:
    "One or two sentences describing the cleaning needed or reason for the call.",
  urgencyDescription:
    "How urgent the request is. 'emergency' = flood, sewage, or biohazard clean-up needed now; 'urgent' = needed within ~24h; 'routine' = regular or scheduled cleaning and quotes; 'unknown' if unclear.",
  intakeFields: [
    {
      key: "property_details",
      label: "Property",
      description:
        "The type and size of the property if given, e.g. '3-bedroom house', 'office, 2 floors'. Empty string if not mentioned.",
    },
  ],
});

export const landscaping = tradeProfile({
  id: "landscaping",
  label: "Landscaping & tree care",
  businessDescription: "a landscaping and tree care company",
  issue: "landscaping or tree work",
  requestNounPlural: "jobs",
  defaultServicesLabel: "General landscaping services",
  defaultServices: [
    { name: "Lawn care and mowing" },
    { name: "Garden design and planting" },
    { name: "Tree trimming and removal" },
    { name: "Storm clean-up" },
  ],
  defaultEmergencyDefinition: (region) =>
    `A fallen tree or large branch on a building, vehicle, driveway, or power line, or blocking access to the property. If it is touching power lines or anyone is hurt, advise the caller to call ${region.emergencyNumber} first.`,
  safetyRules: (region) => [
    `A tree or large branch has fallen on a building, vehicle, or power line: tell them to keep everyone well away and not to try to move it. If it is touching power lines or anyone is hurt, tell them to call ${region.emergencyNumber}.`,
    "Tell callers not to climb trees or use chainsaws to deal with storm damage themselves.",
  ],
  issueSummaryDescription:
    "One or two sentences describing the landscaping or tree work needed, or reason for the call.",
  urgencyDescription:
    "How urgent the job is. 'emergency' = fallen tree or branch on a building, car, or power line, or blocking access; 'urgent' = storm damage needing attention within ~24–48h; 'routine' = regular maintenance, projects, or quotes; 'unknown' if unclear.",
});
