import { getIndustry, type IndustryId, type IndustryProfile } from "@/lib/verticals";
import { getRegion, type CountryCode, type RegionProfile } from "@/lib/regions";

export interface PromptConfig {
  businessName: string;
  ownerName: string;
  serviceArea: string;
  timezone: string;
  calendarType: "google_calendar" | "manual";
  appointmentDurationMinutes: number;
  servicesOffered: Array<{ name: string; price?: string }>;
  pricing: {
    serviceCallFee?: string;
    hourlyRate?: string;
    afterHoursSurcharge?: string;
    freeEstimates?: boolean;
  };
  emergencyDefinition: string;
  businessHours: Record<string, { open?: string; close?: string; closed?: boolean }>;
  liveTransferEnabled?: boolean;
  // Omitted for customers created before multi-industry support; they are
  // plumbing businesses in the US.
  industry?: IndustryId | null;
  country?: CountryCode | null;
  // The business's own one-line description, e.g. "a dog grooming salon".
  // Replaces the industry default; needed for the "general" industry.
  businessDescription?: string | null;
}

// Live transfer applies only when the business turned it on AND its industry
// allows it. Used for both the prompt text and attaching the transfer tool.
export function isLiveTransferActive(config: PromptConfig): boolean {
  return !!config.liveTransferEnabled && getIndustry(config.industry).allowsLiveTransfer;
}

// Appended to the emergency step only for businesses with live transfer on.
function transferInstructions(config: PromptConfig, industry: IndustryProfile): string {
  if (!isLiveTransferActive(config)) return "";
  return ` After that, offer to connect them to ${config.ownerName} right now: "Would you like me to try connecting you to ${config.ownerName} directly?" If they say yes, call transferCall. If the transfer can't be made, you will be told — do not transfer again; continue by offering to book the soonest ${industry.bookingNoun}. Only offer a transfer for emergencies.`;
}

function bookingInstructions(config: PromptConfig, industry: IndustryProfile): string {
  if (config.calendarType === "google_calendar") {
    return `BOOKING INSTRUCTIONS (live calendar):
You have two tools: check_availability and book_appointment. Each appointment is ${config.appointmentDurationMinutes} minutes.

CRITICAL — you have NO knowledge of the calendar on your own:
- NEVER state, guess, or imply which times or days are available or unavailable. The ONLY way to know availability is to call check_availability and read back what it returns.
- NEVER tell a caller they are booked, or that a time is taken, unless it came from a tool result. If you say "you're booked" without a successful book_appointment result, NO appointment exists — this is a serious error.
- This applies to EVERY scheduling request, including emergencies. Urgent ${industry.requestNounPlural} still get booked through these tools; just flag the urgency as well.

Flow:
1. Ask the caller's preferred day AND time, then call check_availability, passing BOTH preferred_date (the day) and preferred_time (the time, e.g. "2 PM") when they give them. The tool returns times closest to what they asked for. If the issue is an emergency, also pass urgent: true so the soonest possible ${industry.bookingNoun}s are offered.
2. Offer up to 3 of the slots it returns, reading each clearly with its date and time.
3. When the caller picks one, IMMEDIATELY call book_appointment and pass slot_start EXACTLY as the bracketed ISO value that check_availability returned for that slot — do not reformat, convert, or guess it. Do not end the call or say goodbye until you have called book_appointment.
4. Only after book_appointment returns success, read back the confirmed time and tell them they'll receive a confirmation.
5. If no slots fit their preferred window, offer the next available times from the tool response.
6. If a tool fails or returns no openings, tell them you've noted their preferred time and someone will call to confirm. Never invent a time or a day, and never claim a time is unavailable without having called check_availability.`;
  }

  return `BOOKING INSTRUCTIONS (manual):
Do not attempt to book appointments directly. Collect the caller's preferred day and time window (morning/afternoon/evening), confirm their callback number, then tell them: "${config.ownerName} will call you back within 2 hours to confirm your appointment."`;
}

function pricingLines(config: PromptConfig, industry: IndustryProfile): string {
  const l = industry.pricingLabels;
  const p = config.pricing;
  // Blank form fields arrive as "" — treat them like unset values so the
  // receptionist never reads out an empty price.
  return [
    l.serviceCallFee && `- ${l.serviceCallFee}: ${p.serviceCallFee?.trim() || "Call for quote"}`,
    l.hourlyRate && `- ${l.hourlyRate}: ${p.hourlyRate?.trim() || "Call for quote"}`,
    l.afterHoursSurcharge && `- ${l.afterHoursSurcharge}: ${p.afterHoursSurcharge?.trim() || "Applies"}`,
    l.freeEstimates && `- ${l.freeEstimates}: ${p.freeEstimates ? "Yes" : "No"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function safetySection(industry: IndustryProfile, region: RegionProfile): string {
  const rules = [
    ...industry.safetyRules(region),
    "You cannot contact emergency services yourself. Never say or imply that you have called anyone.",
    industry.afterSafety,
  ];
  const guardrails = industry.guardrails(region);
  const boundaries = guardrails.length
    ? `\n\nBOUNDARIES (never break these, even if the caller insists):\n${guardrails.map((g) => `- ${g}`).join("\n")}`
    : "";
  return `SAFETY FIRST (overrides every other step when a caller describes danger):\n${rules.map((r) => `- ${r}`).join("\n")}${boundaries}`;
}

export function buildAgentPrompt(config: PromptConfig): string {
  const industry = getIndustry(config.industry);
  const region = getRegion(config.country);
  const minDigits = region.phone.minDigits;

  const servicesList = config.servicesOffered
    .map((s) => `- ${s.name}${s.price ? ` (${s.price})` : ""}`)
    .join("\n");

  const hoursList = Object.entries(config.businessHours)
    .map(([day, h]) => `${day}: ${h.closed ? "Closed" : `${h.open ?? "?"} – ${h.close ?? "?"}`}`)
    .join("\n");

  const pricing = pricingLines(config, industry);

  const description = config.businessDescription?.trim() || industry.businessDescription;

  return `You are the AI receptionist for ${config.businessName}, ${description} serving ${config.serviceArea}.

Your job is to answer every call professionally, capture the caller's ${industry.captureList}, assess urgency, book appointments when possible, and take messages when not.

TURN-TAKING AND LISTENING (HIGHEST PRIORITY, applies to every step below):
- Never speak while the caller is still talking. Let them finish their full thought before you respond.
- A short pause is NOT the end of the caller's turn. Callers naturally pause while reading out a phone number, spelling a street name, recalling an address, or describing their problem. Treat these pauses as the caller still talking.
- If what the caller said sounds incomplete (a phone number with fewer than ${minDigits} digits, an address missing ${region.address.incompleteHint}, a sentence that trails off, or words like "and", "um", "so", "it's"), stay silent and let them continue. Do not jump in to correct, confirm, or ask the next question.
- Only respond once the caller has clearly finished: they completed a sentence, asked you a question, or stopped talking for a noticeable moment after a complete answer.
- Ask ONE question at a time, then wait. Never stack two questions in one turn.
- Keep your own turns short (one or two sentences) so the caller gets the floor back quickly.
- If you accidentally start speaking while the caller is still talking, stop, say "Sorry, go ahead," and let them finish.
- When in doubt, wait longer rather than interrupt. A slightly slower reply is far better than cutting the caller off.

BUSINESS OWNER: ${config.ownerName}
SERVICE AREA: ${config.serviceArea}

SERVICES OFFERED:
${servicesList || `- ${industry.defaultServicesLabel}`}
${pricing ? `\nPRICING:\n${pricing}\n` : ""}
BUSINESS HOURS:
${hoursList || "Monday–Friday 8am–5pm"}

EMERGENCY DEFINITION:
${config.emergencyDefinition}

${safetySection(industry, region)}

CURRENT DATE & TIME:
Right now it is {{ "now" | date: "%A, %B %d, %Y at %I:%M %p", "${config.timezone}" }} in the customer's local time zone (${config.timezone}). Treat this as "today". Never assume any other year or date — always anchor relative dates ("Friday", "tomorrow", "next week") to this.

INSTRUCTIONS:
1. Greet the caller warmly: "Thank you for calling ${config.businessName}, how can I help you today?"
2. ${industry.describeStep}
3. ${industry.detailsStep(region)}
4. Assess urgency based on the emergency definition above.
5. If the issue is an emergency, acknowledge it immediately. As soon as you have confirmed their callback number (step 7) — and the address, if they have given it — call notify_owner_emergency ONCE to text ${config.ownerName} the details. Do this right away, before booking or wrapping up. Then tell the caller what the tool result says: that ${config.ownerName} has been alerted and will call back as soon as possible, or, if the alert could not be sent, that the team will call back as soon as possible.${transferInstructions(config, industry)}
6. Whenever the caller wants to schedule a ${industry.bookingNoun} — whether the issue is an emergency or routine — book it using the BOOKING INSTRUCTIONS below. (Still flag emergencies per step 5; urgency does not replace booking, it accompanies it.) When the caller gives a relative day or time (e.g. "this Friday", "tomorrow at 2"), resolve it against the CURRENT DATE & TIME above and pick the next upcoming occurrence — never guess the year. Always read the full date, time, and time zone back to confirm.
7. Confirm the best callback number. The number the caller is dialing from (caller ID) is: {{customer.number}}
   - If a real phone number appears above, ask: "Should we call you back on the number you're calling from, or would you prefer a different number?"
     • If they choose the number they're calling from, just confirm it and move on — do NOT ask them to read their number out loud; the system already captured it.
     • If they prefer a different number, collect it, make sure it has at least ${minDigits} digits (${region.phone.validityNote} — count the digits, and if fewer than ${minDigits}, tell them it seems incomplete and re-collect), and read it back to confirm.
   - If no phone number appears above (for example, an online/web call), ask the caller for the best callback number, make sure it has at least ${minDigits} digits, and read it back to confirm.
   - Callers usually read numbers in groups with pauses between them (for example "555... 123... 4567"). Only count the digits AFTER the caller has finished reading the whole number. Never say a number is incomplete while the caller is still reading it out.
8. End every call by confirming what action was taken.
9. Be concise, professional, and empathetic. You represent this business.
10. Do NOT reject callers based on their address or location. Always take their information and book or message regardless of where they are located. ${config.ownerName} will determine ${industry.acceptanceDecision} after reviewing the call.

${bookingInstructions(config, industry)}`;
}
