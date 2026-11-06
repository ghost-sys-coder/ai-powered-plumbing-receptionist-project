import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { platformSettings } from "@/db/schema";

// Every platform setting, with its type and the value used until an admin
// changes it. Add new switches here.
export const PLATFORM_SETTINGS = {
  // Whether agency staff may put new receptionists on ElevenLabs. Off until
  // Twilio is verified and numbers can be bought for it. Platform admins can
  // always choose it (for testing).
  elevenlabsForAgencies: false as boolean,
};

export type PlatformSettingKey = keyof typeof PLATFORM_SETTINGS;
export type PlatformSettingValue<K extends PlatformSettingKey> = (typeof PLATFORM_SETTINGS)[K];

export async function getPlatformSetting<K extends PlatformSettingKey>(key: K): Promise<PlatformSettingValue<K>> {
  const [row] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);
  const fallback = PLATFORM_SETTINGS[key];
  return row && typeof row.value === typeof fallback ? (row.value as PlatformSettingValue<K>) : fallback;
}

export async function setPlatformSetting<K extends PlatformSettingKey>(
  key: K,
  value: PlatformSettingValue<K>,
  updatedBy: string
): Promise<void> {
  await db
    .insert(platformSettings)
    .values({ key, value, updatedBy })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedBy, updatedAt: new Date() } });
}
