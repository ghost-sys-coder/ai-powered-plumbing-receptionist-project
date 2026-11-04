import { afterEach, describe, expect, it, vi } from "vitest";
import { buyLocalNumber, releaseNumberByPhone } from "./numbers";

const creds = { accountSid: "AC1", authToken: "tok" };

type Call = { url: string; method: string; body: URLSearchParams | null };

function mockTwilio(handler: (call: Call) => { status?: number; json?: unknown }) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const call = {
        url,
        method: init.method ?? "GET",
        body: init.body ? new URLSearchParams(init.body as URLSearchParams) : null,
      };
      calls.push(call);
      const { status = 200, json = {} } = handler(call);
      return new Response(status === 204 ? null : JSON.stringify(json), { status });
    })
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("buyLocalNumber", () => {
  it("prefers the area code, falls back to any local number, and attaches the bundle", async () => {
    const calls = mockTwilio(({ url, method }) => {
      if (method === "GET" && url.includes("AreaCode=416")) return { json: { available_phone_numbers: [] } };
      if (method === "GET") return { json: { available_phone_numbers: [{ phone_number: "+16475550100" }] } };
      return { status: 201, json: { sid: "PN1", phone_number: "+16475550100" } };
    });

    const bought = await buyLocalNumber({
      country: "CA",
      areaCode: "416",
      bundleSid: "BU1",
      friendlyName: "Acme Plumbing",
      creds,
    });

    expect(bought).toEqual({ sid: "PN1", phoneNumber: "+16475550100" });
    expect(calls).toHaveLength(3);
    expect(calls[0].url).toContain("/Accounts/AC1/AvailablePhoneNumbers/CA/Local.json");
    expect(calls[0].url).toContain("VoiceEnabled=true");
    const purchase = calls[2];
    expect(purchase.method).toBe("POST");
    expect(purchase.url).toMatch(/IncomingPhoneNumbers\.json$/);
    expect(Object.fromEntries(purchase.body!)).toEqual({
      PhoneNumber: "+16475550100",
      BundleSid: "BU1",
      FriendlyName: "Acme Plumbing",
    });
  });

  it("fails clearly when the country has no stock", async () => {
    mockTwilio(() => ({ json: { available_phone_numbers: [] } }));
    await expect(buyLocalNumber({ country: "GB", creds })).rejects.toThrow(/no local numbers available in GB/);
  });

  it("surfaces Twilio's error message", async () => {
    mockTwilio(({ method }) =>
      method === "GET"
        ? { json: { available_phone_numbers: [{ phone_number: "+441234567890" }] } }
        : { status: 400, json: { code: 21649, message: "Bundle required" } }
    );
    await expect(buyLocalNumber({ country: "GB", creds })).rejects.toThrow("Twilio 400 (21649): Bundle required");
  });
});

describe("releaseNumberByPhone", () => {
  it("releases matching numbers on our account and never throws", async () => {
    const calls = mockTwilio(({ method }) =>
      method === "GET" ? { json: { incoming_phone_numbers: [{ sid: "PN9" }] } } : { status: 204 }
    );
    await releaseNumberByPhone("+16475550100", creds);
    expect(calls[0].url).toContain("PhoneNumber=%2B16475550100");
    expect(calls[1]).toMatchObject({ method: "DELETE" });
    expect(calls[1].url).toMatch(/IncomingPhoneNumbers\/PN9\.json$/);

    mockTwilio(() => ({ status: 500, json: { message: "down" } }));
    await expect(releaseNumberByPhone("+1", creds)).resolves.toBeUndefined();
  });
});
