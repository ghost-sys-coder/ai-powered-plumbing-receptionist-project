// Buying and releasing local phone numbers on our Twilio account (REST API,
// no SDK). Numbers bought here are imported into the voice provider, which
// points the number's voice webhook at itself.

const TWILIO_API = "https://api.twilio.com/2010-04-01";
const TIMEOUT_MS = 15_000;

type TwilioCreds = { accountSid: string; authToken: string };

export function twilioCredsFromEnv(env: Record<string, string | undefined> = process.env): TwilioCreds {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)");
  }
  return { accountSid, authToken };
}

async function twilio<T>(
  creds: TwilioCreds,
  path: string,
  init: { method?: "GET" | "POST" | "DELETE"; form?: Record<string, string | undefined> } = {}
): Promise<T> {
  const body = init.form
    ? new URLSearchParams(
        Object.entries(init.form).filter((e): e is [string, string] => !!e[1])
      )
    : undefined;
  const res = await fetch(`${TWILIO_API}/Accounts/${creds.accountSid}${path}`, {
    method: init.method ?? (body ? "POST" : "GET"),
    headers: {
      Authorization: "Basic " + Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64"),
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as T & { message?: string; code?: number };
  if (!res.ok) {
    throw new Error(
      `Twilio ${res.status}${data.code ? ` (${data.code})` : ""}: ${data.message ?? "unknown error"}`
    );
  }
  return data;
}

type AvailableNumbers = { available_phone_numbers?: Array<{ phone_number: string }> };

async function findLocalNumber(
  creds: TwilioCreds,
  country: string,
  areaCode?: string | null
): Promise<string | null> {
  const search = async (params: Record<string, string>) => {
    const qs = new URLSearchParams({ VoiceEnabled: "true", PageSize: "5", ...params });
    const data = await twilio<AvailableNumbers>(
      creds,
      `/AvailablePhoneNumbers/${country}/Local.json?${qs}`
    );
    return data.available_phone_numbers?.[0]?.phone_number ?? null;
  };

  // Prefer the business's own area code (US/Canada only); fall back to any
  // local number in the country rather than failing setup.
  if (areaCode) {
    const near = await search({ AreaCode: areaCode });
    if (near) return near;
  }
  return search({});
}

export async function buyLocalNumber(opts: {
  country: string;
  areaCode?: string | null;
  bundleSid?: string;
  addressSid?: string;
  friendlyName?: string;
  creds?: TwilioCreds;
}): Promise<{ sid: string; phoneNumber: string }> {
  const creds = opts.creds ?? twilioCredsFromEnv();
  const phoneNumber = await findLocalNumber(creds, opts.country, opts.areaCode);
  if (!phoneNumber) {
    throw new Error(`Twilio has no local numbers available in ${opts.country} right now`);
  }
  const bought = await twilio<{ sid: string; phone_number: string }>(creds, "/IncomingPhoneNumbers.json", {
    form: {
      PhoneNumber: phoneNumber,
      BundleSid: opts.bundleSid,
      AddressSid: opts.addressSid,
      FriendlyName: opts.friendlyName?.slice(0, 64),
    },
  });
  return { sid: bought.sid, phoneNumber: bought.phone_number };
}

// Releases a number we bought. Never throws: a failed release is logged and
// can be cleaned up in the Twilio console.
export async function releaseNumber(sid: string, creds?: TwilioCreds): Promise<void> {
  try {
    await twilio(creds ?? twilioCredsFromEnv(), `/IncomingPhoneNumbers/${encodeURIComponent(sid)}.json`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn(`[twilio] releasing number ${sid} failed — ${(err as Error).message}`);
  }
}

// Releases a number by its E.164 value, but only if it's on our account.
export async function releaseNumberByPhone(phoneNumber: string, creds?: TwilioCreds): Promise<void> {
  try {
    const c = creds ?? twilioCredsFromEnv();
    const data = await twilio<{ incoming_phone_numbers?: Array<{ sid: string }> }>(
      c,
      `/IncomingPhoneNumbers.json?${new URLSearchParams({ PhoneNumber: phoneNumber })}`
    );
    for (const n of data.incoming_phone_numbers ?? []) await releaseNumber(n.sid, c);
  } catch (err) {
    console.warn(`[twilio] releasing ${phoneNumber} failed — ${(err as Error).message}`);
  }
}

// Calling-code prefix per country. US and Canada share +1.
const COUNTRY_PREFIX: Record<string, string> = { US: "+1", CA: "+1", GB: "+44", AU: "+61", UG: "+256" };

type IncomingNumbers = {
  incoming_phone_numbers?: Array<{ sid: string; phone_number: string; voice_url?: string | null }>;
};

// A number we already own that no voice platform is using: its voice webhook
// is empty (importing into Vapi or ElevenLabs sets it) and it isn't in
// `taken`. Lets us reuse owned numbers when buying new ones isn't possible
// (e.g. before Twilio business verification). Null when there's none.
export async function findSpareNumber(
  country: string,
  taken: ReadonlySet<string>,
  creds: TwilioCreds = twilioCredsFromEnv()
): Promise<string | null> {
  const prefix = COUNTRY_PREFIX[country];
  if (!prefix) return null;
  const data = await twilio<IncomingNumbers>(creds, "/IncomingPhoneNumbers.json?PageSize=100");
  const spare = (data.incoming_phone_numbers ?? []).find(
    (n) => n.phone_number.startsWith(prefix) && !n.voice_url && !taken.has(n.phone_number)
  );
  return spare?.phone_number ?? null;
}

// Clears a number's inbound-call webhook, so it reads as unused again after
// a voice platform lets it go (ElevenLabs leaves its own URL in place).
// Never throws.
export async function clearVoiceUrl(phoneNumber: string, creds?: TwilioCreds): Promise<void> {
  try {
    const c = creds ?? twilioCredsFromEnv();
    const data = await twilio<IncomingNumbers>(
      c,
      `/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`
    );
    const sid = data.incoming_phone_numbers?.[0]?.sid;
    if (!sid) return;
    // Sent directly: the helper drops empty form values, and empty is the point.
    const res = await fetch(`${TWILIO_API}/Accounts/${c.accountSid}/IncomingPhoneNumbers/${sid}.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${c.accountSid}:${c.authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ VoiceUrl: "" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) console.warn(`[twilio] clearing voice URL for ${phoneNumber} failed (${res.status})`);
  } catch (err) {
    console.warn(`[twilio] clearing voice URL for ${phoneNumber} failed`, err);
  }
}
