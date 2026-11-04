import type { CountryCode } from "@/lib/regions";

// Where a new receptionist's phone number comes from, per country.
//
//   US     — a free number issued by the voice provider (Vapi).
//   CA     — bought from our Twilio account, then imported into the provider.
//   GB, AU — same, but local numbers there need an approved Twilio
//            "regulatory bundle" (business identity + address). Set
//            TWILIO_BUNDLE_SID_<CC> (and TWILIO_ADDRESS_SID_<CC> if the bundle
//            needs a separate address) once Twilio approves it.
//   UG     — Twilio doesn't sell Ugandan numbers; the business forwards its own
//            line (manual setup for now).
//
// When a number can't be sourced the customer is still created, just without
// a number, and staff are told why.

export type NumberSourcing =
  | { kind: "provider" }
  | {
      kind: "twilio";
      country: CountryCode;
      bundleSid?: string;
      addressSid?: string;
    }
  | { kind: "unavailable"; reason: string };

type Env = Record<string, string | undefined>;

const BUNDLE_COUNTRIES: ReadonlySet<CountryCode> = new Set(["GB", "AU"]);

const COUNTRY_NAMES: Record<CountryCode, string> = {
  US: "US",
  CA: "Canadian",
  GB: "UK",
  AU: "Australian",
  UG: "Ugandan",
};

export function isTwilioConfigured(env: Env = process.env): boolean {
  return !!env.TWILIO_ACCOUNT_SID && !!env.TWILIO_AUTH_TOKEN;
}

export function numberSourcing(country: CountryCode, env: Env = process.env): NumberSourcing {
  if (country === "US") return { kind: "provider" };

  if (country === "UG") {
    return {
      kind: "unavailable",
      reason:
        "Ugandan numbers can't be issued automatically yet. Forward the business's own line to the receptionist instead.",
    };
  }

  const name = COUNTRY_NAMES[country];
  if (!isTwilioConfigured(env)) {
    return {
      kind: "unavailable",
      reason: `${name} numbers come from Twilio, which isn't configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).`,
    };
  }

  if (BUNDLE_COUNTRIES.has(country)) {
    const bundleSid = env[`TWILIO_BUNDLE_SID_${country}`]?.trim();
    if (!bundleSid) {
      return {
        kind: "unavailable",
        reason: `${name} numbers need an approved Twilio regulatory bundle. Once Twilio approves it, set TWILIO_BUNDLE_SID_${country} and add the number from the customer page.`,
      };
    }
    const addressSid = env[`TWILIO_ADDRESS_SID_${country}`]?.trim() || undefined;
    return { kind: "twilio", country, bundleSid, addressSid };
  }

  return { kind: "twilio", country };
}

// Thrown by a provider when sourcing says no number can be issued. The create
// flow catches it and finishes setup without a number.
export class PhoneNumberUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "PhoneNumberUnavailableError";
  }
}
