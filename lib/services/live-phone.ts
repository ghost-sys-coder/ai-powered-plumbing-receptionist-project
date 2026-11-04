import { unstable_cache } from "next/cache";
import { getCustomerReceptionist } from "@/lib/voice";

// The phone number attached to a customer's receptionist, read live from its
// voice provider and cached for 5 minutes per customer so the agent pages
// don't hit the provider API on every render. The number rarely changes.
// Kept in its own module so the `next/cache` import never reaches the
// standalone tsx scripts. Never throws — pages fall back to the stored number.
export function getCachedLiveAssistantPhoneNumber(opts: {
  customerId: string;
}): Promise<{ number: string; status?: string } | null> {
  return unstable_cache(
    async () => {
      try {
        const receptionist = await getCustomerReceptionist(opts.customerId);
        if (!receptionist) return null;
        return await receptionist.provider.getLivePhoneNumber({
          phoneNumberId: receptionist.phoneNumberId,
          agentId: receptionist.agentId,
        });
      } catch (err) {
        console.error("[live-phone] lookup failed", err);
        return null;
      }
    },
    ["live-phone", opts.customerId],
    { revalidate: 300, tags: ["vapi-phone"] }
  )();
}
