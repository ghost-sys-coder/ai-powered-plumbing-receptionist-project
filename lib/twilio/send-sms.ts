// Sends an SMS via Twilio's REST API (no SDK needed for a single endpoint).
// Never throws: callers get { ok: false, error } so a failed text can't break
// the live call flow that triggered it.
export type SendSmsResult = { ok: true; sid: string } | { ok: false; error: string };

const TWILIO_TIMEOUT_MS = 8000; // well under Vapi's 20s tool timeout

export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, error: "Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER)" };
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
      signal: AbortSignal.timeout(TWILIO_TIMEOUT_MS),
    });
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
    if (!res.ok || !data.sid) {
      return { ok: false, error: `Twilio ${res.status}${data.code ? ` (${data.code})` : ""}: ${data.message ?? "unknown error"}` };
    }
    return { ok: true, sid: data.sid };
  } catch (err) {
    return { ok: false, error: `Twilio request failed: ${(err as Error).message}` };
  }
}
