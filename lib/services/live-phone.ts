import { unstable_cache } from "next/cache";
import { getLiveAssistantPhoneNumber } from "./vapi-provisioning";

// Caches the live Vapi phone-number lookup for 5 minutes per assistant/number,
// so we don't hit the Vapi API on every agent-page render. The number rarely
// changes. Kept in its own module so the `next/cache` import never reaches the
// standalone tsx scripts that import from vapi-provisioning directly.
export function getCachedLiveAssistantPhoneNumber(opts: {
  phoneNumberId?: string | null;
  assistantId?: string | null;
}): Promise<{ number: string; status?: string } | null> {
  return unstable_cache(
    () => getLiveAssistantPhoneNumber(opts),
    ["vapi-live-phone", opts.phoneNumberId ?? "", opts.assistantId ?? ""],
    { revalidate: 300, tags: ["vapi-phone"] }
  )();
}
