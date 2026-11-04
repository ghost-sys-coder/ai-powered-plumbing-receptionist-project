// Country profiles: everything the receptionist says or validates that depends
// on where the business operates (emergency numbers, phone-number length,
// address shape, gas emergency contacts). Kept separate from industry profiles
// so any industry can run in any country.
//
// Facts here are spoken to callers in emergencies — verify any change against
// an official source before shipping it.

export const COUNTRY_CODES = ["US", "CA", "GB", "AU", "UG"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const DEFAULT_COUNTRY: CountryCode = "US";

export interface RegionProfile {
  code: CountryCode;
  label: string;
  // BCP 47 locale for dates/times shown in the dashboards.
  locale: string;
  defaultTimezone: string;
  timezones: Array<{ value: string; label: string }>;
  // Label for customers.state in forms: State / Province / County / District.
  subdivisionLabel: string;
  // Spoken as "call <emergencyNumber>".
  emergencyNumber: string;
  // Mental-health crisis line, spoken as "or <crisisLine>". Omitted when there
  // is no single national line we can stand behind.
  crisisLine?: string;
  // What a lawyer is called locally (used by the legal profile).
  lawyerTerm: string;
  phone: {
    // Minimum digits in a complete national number as callers read it out.
    minDigits: number;
    // Shown in the prompt: "(<validityNote> — count the digits, …)".
    validityNote: string;
  };
  address: {
    // "…the full service address where the work is needed — <parts>."
    parts: string;
    // Turn-taking hint: "an address missing <incompleteHint>".
    incompleteHint: string;
  };
  gas:
    | { supply: "piped"; emergencyContact: string }
    // Bottled LPG is the norm — there is no utility emergency line to call.
    | { supply: "cylinder" };
}

const REGIONS: Record<CountryCode, RegionProfile> = {
  US: {
    code: "US",
    label: "United States",
    locale: "en-US",
    defaultTimezone: "America/New_York",
    timezones: [
      { value: "America/New_York", label: "Eastern Time" },
      { value: "America/Chicago", label: "Central Time" },
      { value: "America/Denver", label: "Mountain Time" },
      { value: "America/Phoenix", label: "Arizona Time" },
      { value: "America/Los_Angeles", label: "Pacific Time" },
      { value: "America/Anchorage", label: "Alaska Time" },
      { value: "Pacific/Honolulu", label: "Hawaii Time" },
    ],
    subdivisionLabel: "State",
    emergencyNumber: "911",
    crisisLine: "the 988 Suicide & Crisis Lifeline by calling or texting 988",
    lawyerTerm: "attorney",
    phone: { minDigits: 10, validityNote: "a valid US number" },
    address: {
      parts: "street number and name, city, and state",
      incompleteHint: "a city or state",
    },
    gas: { supply: "piped", emergencyContact: "the gas company's emergency line" },
  },
  CA: {
    code: "CA",
    label: "Canada",
    locale: "en-CA",
    defaultTimezone: "America/Toronto",
    timezones: [
      { value: "America/St_Johns", label: "Newfoundland Time" },
      { value: "America/Halifax", label: "Atlantic Time" },
      { value: "America/Toronto", label: "Eastern Time" },
      { value: "America/Winnipeg", label: "Central Time" },
      { value: "America/Regina", label: "Saskatchewan Time" },
      { value: "America/Edmonton", label: "Mountain Time" },
      { value: "America/Vancouver", label: "Pacific Time" },
    ],
    subdivisionLabel: "Province",
    emergencyNumber: "911",
    crisisLine: "the 9-8-8 Suicide Crisis Helpline by calling or texting 988",
    lawyerTerm: "lawyer",
    phone: { minDigits: 10, validityNote: "a valid Canadian number" },
    address: {
      parts: "street number and name, city, and province",
      incompleteHint: "a city or province",
    },
    gas: { supply: "piped", emergencyContact: "the gas utility's emergency line" },
  },
  GB: {
    code: "GB",
    label: "United Kingdom",
    locale: "en-GB",
    defaultTimezone: "Europe/London",
    timezones: [{ value: "Europe/London", label: "UK Time" }],
    subdivisionLabel: "County",
    emergencyNumber: "999",
    crisisLine: "Samaritans on 116 123",
    lawyerTerm: "solicitor",
    phone: {
      minDigits: 11,
      validityNote: "a valid UK number, including the leading 0",
    },
    address: {
      parts: "house number and street, town or city, and postcode",
      incompleteHint: "a town or postcode",
    },
    gas: {
      supply: "piped",
      emergencyContact: "the National Gas Emergency Service on 0800 111 999",
    },
  },
  AU: {
    code: "AU",
    label: "Australia",
    locale: "en-AU",
    defaultTimezone: "Australia/Sydney",
    timezones: [
      { value: "Australia/Sydney", label: "Sydney / Melbourne / Canberra" },
      { value: "Australia/Brisbane", label: "Brisbane" },
      { value: "Australia/Adelaide", label: "Adelaide" },
      { value: "Australia/Darwin", label: "Darwin" },
      { value: "Australia/Perth", label: "Perth" },
      { value: "Australia/Hobart", label: "Hobart" },
    ],
    subdivisionLabel: "State / Territory",
    emergencyNumber: "000",
    crisisLine: "Lifeline on 13 11 14",
    lawyerTerm: "lawyer",
    phone: {
      minDigits: 10,
      validityNote: "a valid Australian number, including the leading 0",
    },
    address: {
      parts: "street number and name, suburb, state, and postcode",
      incompleteHint: "a suburb or postcode",
    },
    gas: { supply: "piped", emergencyContact: "their gas distributor's emergency line" },
  },
  UG: {
    code: "UG",
    label: "Uganda",
    locale: "en-UG",
    defaultTimezone: "Africa/Kampala",
    timezones: [{ value: "Africa/Kampala", label: "East Africa Time" }],
    subdivisionLabel: "District",
    emergencyNumber: "999 or 112",
    lawyerTerm: "advocate",
    phone: {
      minDigits: 10,
      validityNote: "a valid Ugandan number, including the leading 0",
    },
    address: {
      // Many locations have no street numbers; landmarks are how people direct
      // visitors, so ask for one rather than insisting on a street address.
      parts:
        "the area or village, the road if there is one, a nearby landmark, and the town or district (many places don't have street numbers, so a landmark is fine)",
      incompleteHint: "an area or landmark",
    },
    gas: { supply: "cylinder" },
  },
};

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === "string" && (COUNTRY_CODES as readonly string[]).includes(value);
}

export function getRegion(code: string | null | undefined): RegionProfile {
  return REGIONS[isCountryCode(code) ? code : DEFAULT_COUNTRY];
}

export function listRegions(): RegionProfile[] {
  return COUNTRY_CODES.map((c) => REGIONS[c]);
}
