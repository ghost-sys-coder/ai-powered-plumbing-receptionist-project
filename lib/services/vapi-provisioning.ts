import { VapiClient } from "@vapi-ai/server-sdk";
import { buildAgentPrompt } from "@/lib/templates/agent-prompt";

function getVapi() {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error("VAPI_API_KEY is not set");
  return new VapiClient({ token: key });
}

export interface ProvisioningConfig {
  businessName: string;
  ownerName: string;
  serviceArea: string;
  servicesOffered: Array<{ name: string; price?: string }>;
  pricing: {
    serviceCallFee?: string;
    hourlyRate?: string;
    afterHoursSurcharge?: string;
    freeEstimates?: boolean;
  };
  emergencyDefinition: string;
  businessHours: Record<string, { open?: string; close?: string; closed?: boolean }>;
}

function extractVapiError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    // @vapi-ai/server-sdk wraps API errors with body/statusCode
    if (e.body && typeof e.body === "object") {
      const body = e.body as Record<string, unknown>;
      const msg = body.message ?? body.error ?? body.detail;
      if (msg) return `Vapi: ${msg} (status ${e.statusCode ?? "?"})`;
    }
    if (typeof e.message === "string") return e.message;
  }
  return String(err);
}

export async function createVapiAssistant(
  config: ProvisioningConfig
): Promise<{ vapiAssistantId: string }> {
  const systemPrompt = buildAgentPrompt(config);
  const vapi = getVapi();

  try {
    const assistant = await vapi.assistants.create({
      name: `${config.businessName} AI Receptionist`,
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }],
      } as any,
      voice: { provider: "11labs", voiceId: "paula" } as any,
      firstMessage: `Thank you for calling ${config.businessName}, how can I help you today?`,
    });
    return { vapiAssistantId: assistant.id };
  } catch (err) {
    throw new Error(`Failed to create Vapi assistant — ${extractVapiError(err)}`);
  }
}

export function extractAreaCode(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 3) return digits;                              // bare area code e.g. "580"
  if (digits.length === 11 && digits[0] === "1") return digits.slice(1, 4); // +1XXXXXXXXXX
  if (digits.length === 10) return digits.slice(0, 3);                // XXXXXXXXXX
  return null;
}

export async function provisionVapiPhoneNumber(areaCode?: string | null): Promise<{
  vapiPhoneNumberId: string;
  phoneNumber: string;
}> {
  const vapi = getVapi();

  const payload: Record<string, unknown> = { provider: "vapi" };
  if (areaCode) payload.numberDesiredAreaCode = areaCode;

  try {
    const number = await vapi.phoneNumbers.create(payload as any);
    return {
      vapiPhoneNumberId: (number as any).id,
      phoneNumber: (number as any).number ?? "",
    };
  } catch (err) {
    const areaInfo = areaCode ? ` (area code ${areaCode})` : "";
    throw new Error(`Failed to provision phone number${areaInfo} — ${extractVapiError(err)}`);
  }
}

export async function updateVapiAssistant(
  assistantId: string,
  config: ProvisioningConfig
): Promise<void> {
  const systemPrompt = buildAgentPrompt(config);
  const vapi = getVapi();

  await vapi.assistants.update({
    id: assistantId,
    name: `${config.businessName} AI Receptionist`,
    model: {
      provider: "openai",
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }],
    } as any,
    firstMessage: `Thank you for calling ${config.businessName}, how can I help you today?`,
  } as any);
}

export async function linkPhoneNumberToAssistant(
  vapiPhoneNumberId: string,
  vapiAssistantId: string
): Promise<void> {
  const vapi = getVapi();
  try {
    await vapi.phoneNumbers.update({
      id: vapiPhoneNumberId,
      body: { assistantId: vapiAssistantId } as any,
    });
  } catch (err) {
    throw new Error(`Failed to link phone number to assistant — ${extractVapiError(err)}`);
  }
}
