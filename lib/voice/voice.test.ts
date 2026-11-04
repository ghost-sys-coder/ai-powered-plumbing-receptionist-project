import { afterEach, describe, expect, it, vi } from "vitest";
import { createProvider, isVoiceProviderId, resolveProviderCredentials } from "./index";

afterEach(() => vi.unstubAllEnvs());

describe("resolveProviderCredentials", () => {
  it("uses the platform key for each provider", async () => {
    vi.stubEnv("VAPI_API_KEY", "vapi-key");
    vi.stubEnv("ELEVENLABS_API_KEY", "el-key");
    await expect(resolveProviderCredentials("vapi", "org-1")).resolves.toEqual({
      provider: "vapi",
      apiKey: "vapi-key",
      source: "platform",
    });
    await expect(resolveProviderCredentials("elevenlabs", null)).resolves.toMatchObject({
      apiKey: "el-key",
    });
  });

  it("fails loudly when the platform key is missing", async () => {
    vi.stubEnv("VAPI_API_KEY", "");
    await expect(resolveProviderCredentials("vapi")).rejects.toThrow("VAPI_API_KEY is not set");
  });
});

describe("createProvider", () => {
  it("builds the Vapi adapter", () => {
    const provider = createProvider({ provider: "vapi", apiKey: "k", source: "platform" });
    expect(provider.id).toBe("vapi");
    for (const method of [
      "createAgent",
      "updateAgent",
      "deleteResources",
      "provisionPhoneNumber",
      "attachPhoneNumber",
      "getLivePhoneNumber",
      "getRecordingUrl",
    ] as const) {
      expect(typeof provider[method]).toBe("function");
    }
  });

  it("refuses ElevenLabs until its adapter exists", () => {
    expect(() => createProvider({ provider: "elevenlabs", apiKey: "k", source: "platform" })).toThrow(
      /isn't available yet/
    );
  });

  it("validates provider ids", () => {
    expect(isVoiceProviderId("vapi")).toBe(true);
    expect(isVoiceProviderId("retell")).toBe(false);
  });
});
