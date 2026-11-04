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
