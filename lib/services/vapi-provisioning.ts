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

export async function createVapiAssistant(
  config: ProvisioningConfig
): Promise<{ vapiAssistantId: string }> {
  const systemPrompt = buildAgentPrompt(config);
  const vapi = getVapi();

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
}

export async function provisionVapiPhoneNumber(): Promise<{
  vapiPhoneNumberId: string;
  phoneNumber: string;
}> {
  const vapi = getVapi();

  const number = await vapi.phoneNumbers.create({
    provider: "vapi",
  } as any);

  return {
    vapiPhoneNumberId: (number as any).id,
    phoneNumber: (number as any).number ?? "",
  };
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
  await vapi.phoneNumbers.update({
    id: vapiPhoneNumberId,
    body: { assistantId: vapiAssistantId } as any,
  });
}
