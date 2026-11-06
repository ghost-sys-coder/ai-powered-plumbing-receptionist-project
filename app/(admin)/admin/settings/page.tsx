import { AudioLines } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/auth/staff";
import { getPlatformSetting } from "@/lib/services/platform-settings";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { SettingToggle } from "@/components/admin/setting-toggle";
import { Card } from "@/components/ui/card";

// Platform-wide switches. Platform admins only.
const SettingsPage = async () => {
  await requirePlatformAdmin();
  const configured = !!process.env.ELEVENLABS_API_KEY;
  const forAgencies = await getPlatformSetting("elevenlabsForAgencies");

  return (
    <div className="animate-fade-in max-w-3xl space-y-6">
      <PageHeader eyebrow="Platform" title="Settings" description="Switches that apply to every agency on the platform." />

      <Card className="gap-0 py-0">
        <SectionHeader
          icon={AudioLines}
          title="Voice platforms"
          description="Which platforms new receptionists can run on"
          className="pt-5"
        />
        <div className="flex items-start justify-between gap-6 px-5 py-5">
          <div className="min-w-0 space-y-1.5 text-sm">
            <p className="font-medium">Offer ElevenLabs to agencies</p>
            <p className="text-muted-foreground">
              When on, agency staff can choose ElevenLabs in the setup wizard. When off, only platform admins can,
              for testing. Vapi is always available, and receptionists already on ElevenLabs keep working either way.
            </p>
            <p className="text-muted-foreground">
              Keep this off until Twilio can sell numbers: ElevenLabs only answers on Twilio numbers.
            </p>
            {!configured && (
              <p className="text-amber-700 dark:text-amber-300">
                ElevenLabs isn&apos;t configured on this server (ELEVENLABS_API_KEY), so nobody can choose it.
              </p>
            )}
          </div>
          <SettingToggle
            settingKey="elevenlabsForAgencies"
            initial={forAgencies}
            label="Offer ElevenLabs to agencies"
            disabled={!configured}
          />
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
