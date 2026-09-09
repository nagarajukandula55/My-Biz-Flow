/**
 * Per-partner Field Force settings — currently just the two public
 * signup-page toggles. Off by default; a Super Admin turns them on from
 * field-force/admin once a partner is ready to run public signup.
 */
import { prisma } from "@/lib/prisma";

export type FieldForceSettingsRecord = {
  partnerId: string;
  customerSignupEnabled: boolean;
  providerSignupEnabled: boolean;
};

const DEFAULTS = (partnerId: string): FieldForceSettingsRecord => ({
  partnerId,
  customerSignupEnabled: false,
  providerSignupEnabled: false,
});

export async function getFieldForceSettings(partnerId: string): Promise<FieldForceSettingsRecord> {
  const row = await prisma.fieldForceSettings.findUnique({ where: { partnerId } });
  return row ?? DEFAULTS(partnerId);
}

export async function setFieldForceSettings(
  partnerId: string,
  input: { customerSignupEnabled: boolean; providerSignupEnabled: boolean }
): Promise<void> {
  await prisma.fieldForceSettings.upsert({
    where: { partnerId },
    create: { partnerId, ...input },
    update: input,
  });
}
