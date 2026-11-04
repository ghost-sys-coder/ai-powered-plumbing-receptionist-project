// A mid-call tool invocation, normalised from whichever provider sent it.
// Provider route adapters (lib/voice/vapi/tool-route.ts, later ElevenLabs)
// parse their own payload into this shape and turn the returned text into
// their own response format.
export type ToolInvocation = {
  // The provider's id for the receptionist (vapi_agents.vapi_assistant_id).
  agentId: string | null;
  // The provider's id for the live call (calls.vapi_call_id).
  providerCallId: string | null;
  // Caller ID, when the provider knows it.
  callerNumber: string | null;
  args: Record<string, string>;
};

export type ToolHandler = {
  // Function name the model calls.
  name: string;
  // Spoken-safe message when the request can't even be parsed.
  invalidRequestMessage: string;
  // Returns the text the model reads back and acts on.
  run(invocation: ToolInvocation): Promise<string>;
};
