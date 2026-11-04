import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const vapiOps = vi.hoisted(() => ({
  provisionVapiPhoneNumber: vi.fn(),
  importTwilioNumberToVapi: vi.fn(),
  getVapiPhoneNumberInfo: vi.fn(),
  deleteVapiResources: vi.fn(),
}));
const twilioOps = vi.hoisted(() => ({
  buyLocalNumber: vi.fn(),
  releaseNumber: vi.fn(),
  releaseNumberByPhone: vi.fn(),
}));

vi.mock("@/lib/services/vapi-provisioning", () => ({
  ...vapiOps,
  getVapi: () => ({}),
  createVapiAssistant: vi.fn(),
  updateVapiAssistant: vi.fn(),
  linkPhoneNumberToAssistant: vi.fn(),
  getLiveAssistantPhoneNumber: vi.fn(),
}));
vi.mock("@/lib/twilio/numbers", () => ({
  ...twilioOps,
  twilioCredsFromEnv: () => ({ accountSid: "AC1", authToken: "tok" }),
}));

import { createVapiProvider } from "./provider";
import { PhoneNumberUnavailableError } from "../phone-numbers";

const provider = () => createVapiProvider({ provider: "vapi", apiKey: "k", source: "platform" });

beforeEach(() => {
  vi.stubEnv("TWILIO_ACCOUNT_SID", "AC1");
  vi.stubEnv("TWILIO_AUTH_TOKEN", "tok");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Vapi provider phone numbers", () => {
  it("issues US numbers natively", async () => {
    vapiOps.provisionVapiPhoneNumber.mockResolvedValue({ vapiPhoneNumberId: "v1", phoneNumber: "+15125550100" });
    await expect(provider().provisionPhoneNumber({ country: "US", areaCode: "512" })).resolves.toEqual({
      phoneNumberId: "v1",
      phoneNumber: "+15125550100",
      source: "vapi_native",
    });
    expect(vapiOps.provisionVapiPhoneNumber).toHaveBeenCalledWith(expect.anything(), "512");
    expect(twilioOps.buyLocalNumber).not.toHaveBeenCalled();
  });

  it("buys Canadian numbers on Twilio and imports them", async () => {
    twilioOps.buyLocalNumber.mockResolvedValue({ sid: "PN1", phoneNumber: "+14165550100" });
    vapiOps.importTwilioNumberToVapi.mockResolvedValue({ vapiPhoneNumberId: "v2", phoneNumber: "+14165550100" });

    await expect(
      provider().provisionPhoneNumber({ country: "CA", areaCode: "416", label: "Acme" })
    ).resolves.toEqual({ phoneNumberId: "v2", phoneNumber: "+14165550100", source: "twilio_imported" });
    expect(twilioOps.buyLocalNumber).toHaveBeenCalledWith(
      expect.objectContaining({ country: "CA", areaCode: "416", friendlyName: "Acme" })
    );
    expect(vapiOps.importTwilioNumberToVapi).toHaveBeenCalledWith(expect.anything(), {
      number: "+14165550100",
      twilioAccountSid: "AC1",
      twilioAuthToken: "tok",
      name: "Acme",
    });
  });

  it("passes the UK bundle and ignores area codes outside North America", async () => {
    vi.stubEnv("TWILIO_BUNDLE_SID_GB", "BU1");
    twilioOps.buyLocalNumber.mockResolvedValue({ sid: "PN3", phoneNumber: "+442071234567" });
    vapiOps.importTwilioNumberToVapi.mockResolvedValue({ vapiPhoneNumberId: "v3", phoneNumber: "+442071234567" });
    await provider().provisionPhoneNumber({ country: "GB", areaCode: "207" });
    expect(twilioOps.buyLocalNumber).toHaveBeenCalledWith(
      expect.objectContaining({ country: "GB", areaCode: null, bundleSid: "BU1" })
    );
  });

  it("releases the Twilio number if the import fails", async () => {
    twilioOps.buyLocalNumber.mockResolvedValue({ sid: "PN1", phoneNumber: "+14165550100" });
    vapiOps.importTwilioNumberToVapi.mockRejectedValue(new Error("vapi down"));
    await expect(provider().provisionPhoneNumber({ country: "CA" })).rejects.toThrow("vapi down");
    expect(twilioOps.releaseNumber).toHaveBeenCalledWith("PN1", expect.anything());
  });

  it("refuses countries that can't be served yet without buying anything", async () => {
    await expect(provider().provisionPhoneNumber({ country: "UG" })).rejects.toBeInstanceOf(
      PhoneNumberUnavailableError
    );
    await expect(provider().provisionPhoneNumber({ country: "AU" })).rejects.toBeInstanceOf(
      PhoneNumberUnavailableError
    );
    expect(twilioOps.buyLocalNumber).not.toHaveBeenCalled();
  });
});

describe("Vapi provider teardown", () => {
  it("releases Twilio numbers on our account only", async () => {
    vapiOps.getVapiPhoneNumberInfo.mockResolvedValueOnce({
      provider: "twilio",
      number: "+14165550100",
      twilioAccountSid: "AC1",
    });
    await provider().deleteResources({ agentId: "a1", phoneNumberId: "v2" });
    expect(vapiOps.deleteVapiResources).toHaveBeenCalledWith(expect.anything(), {
      vapiAssistantId: "a1",
      vapiPhoneNumberId: "v2",
    });
    expect(twilioOps.releaseNumberByPhone).toHaveBeenCalledWith("+14165550100");

    vapiOps.getVapiPhoneNumberInfo.mockResolvedValueOnce({
      provider: "twilio",
      number: "+14165550199",
      twilioAccountSid: "AC-someone-else",
    });
    await provider().deleteResources({ phoneNumberId: "v9" });
    vapiOps.getVapiPhoneNumberInfo.mockResolvedValueOnce({ provider: "vapi", number: "+15125550100" });
    await provider().deleteResources({ phoneNumberId: "v1" });
    expect(twilioOps.releaseNumberByPhone).toHaveBeenCalledTimes(1);
  });
});
