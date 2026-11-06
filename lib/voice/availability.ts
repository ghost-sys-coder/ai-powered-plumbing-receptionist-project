import type { StaffViewer } from "@/lib/auth/staff";
import { getPlatformSetting } from "@/lib/services/platform-settings";

// Pure rule, for testing: ElevenLabs needs its key on the server; platform
// admins can always use it, agency staff only when it's switched on.
export function elevenLabsAllowed(opts: {
  configured: boolean;
  viewerKind: StaffViewer["kind"];
  forAgencies: boolean;
}): boolean {
  if (!opts.configured) return false;
  return opts.viewerKind === "platform" || opts.forAgencies;
}

// Whether this staff member may put a new receptionist on ElevenLabs.
export async function canUseElevenLabs(viewer: StaffViewer): Promise<boolean> {
  const configured = !!process.env.ELEVENLABS_API_KEY;
  if (!configured) return false;
  if (viewer.kind === "platform") return true;
  return elevenLabsAllowed({
    configured,
    viewerKind: viewer.kind,
    forAgencies: await getPlatformSetting("elevenlabsForAgencies"),
  });
}
