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
  // Field Force is our single marketplace, operated under FF0001. Its two
  // public self-serve entry points are open by default; other partners remain
  // closed unless explicitly configured.
  customerSignupEnabled: partnerId === "FF0001",
  providerSignupEnabled: partnerId === "FF0001",
});

export async function getFieldForceSettings(partnerId: string): Promise<FieldForceSettingsRecord> {
  const row = await prisma.fieldForceSettings.findUnique({ where: { partnerId } });
  if (!row) return DEFAULTS(partnerId);
  // FF0001 is the single public marketplace operator. Keep its two direct
  // entry points available even if an older settings row was created before
  // Field Force stopped being a Partner-registration product.
  if (partnerId === "FF0001") {
    return { ...row, customerSignupEnabled: true, providerSignupEnabled: true };
  }
  return row;
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
