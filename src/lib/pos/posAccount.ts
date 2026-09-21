/**
 * POS Account + Staff provisioning — the identity layer behind POS's own
 * signup/login (src/lib/pos/posAuth.ts), kept separate from every other
 * module's data since POS uses real Prisma models (PosAccount/PosStaff),
 * not the generic BusinessRecord JSON store the rest of the app's modules
 * use — a staff login needs a real unique/indexed credential lookup, which
 * BusinessRecord's JSON-blob search can't do efficiently.
 */
import { prisma } from "@/lib/prisma";
import { getNextNumber } from "@/lib/designer/numbering";
import { hashPassword } from "@/lib/passwords";

const POS_ACCOUNT_NUMBER_DEFAULTS = { prefix: "POS", separator: "none" as const, financialYearFormat: "none" as const, sequenceDigits: 4, sequenceStart: 1, suffix: "" };
const POS_STAFF_SEQUENCE_DEFAULTS = { prefix: "", separator: "none" as const, financialYearFormat: "none" as const, sequenceDigits: 2, sequenceStart: 1, suffix: "" };

/** One PosAccount per partner — created lazily on first staff signup, not at partner onboarding, since not every partner enables POS. */
export async function getOrCreatePosAccount(partnerId: string, outletName?: string) {
  const existing = await prisma.posAccount.findUnique({ where: { partnerId } });
  if (existing) return existing;

  const accountNumber = await getNextNumber("pos.account", partnerId, POS_ACCOUNT_NUMBER_DEFAULTS);
  return prisma.posAccount.create({
    data: { partnerId, accountNumber, outletName: outletName || null },
  });
}

export type CreatePosStaffInput = {
  posAccountId: string;
  accountNumber: string;
  name: string;
  phone?: string;
  password: string;
  role: "Cashier" | "Manager";
};

/**
 * Composite staffCode ("POS0001-01") — the account's own number plus a
 * sequence scoped to THIS account (via a dynamic documentType embedding
 * posAccountId, so each account transparently gets its own independent
 * 01/02/03... counter with no schema changes needed — see getNextNumber's
 * scopeKey in numbering.ts).
 */
export async function createPosStaff(input: CreatePosStaffInput) {
  const seq = await getNextNumber(`pos.staff.${input.posAccountId}`, undefined, POS_STAFF_SEQUENCE_DEFAULTS);
  const staffCode = `${input.accountNumber}-${seq}`;
  return prisma.posStaff.create({
    data: {
      posAccountId: input.posAccountId,
      staffCode,
      name: input.name,
      phone: input.phone || null,
      role: input.role,
      passwordHash: hashPassword(input.password),
    },
  });
}
