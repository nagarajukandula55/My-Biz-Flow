import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { withRecordLock } from "@/lib/withRecordLock";
import { generatePassword, hashPassword } from "@/lib/passwords";
import { parseProductDomains } from "@/lib/catalog/productDomains";
import { MODULES } from "@/lib/designer/modules";
import type { PartnerSignupInput } from "@/lib/partnerData";

/** New registrations only. Existing accounts and Service Centre operations are never updated. */
export async function provisionSignup(input: PartnerSignupInput & { distributorPartnerId?: string; referringDealerCustomerId?: string }): Promise<{ id: string }> {
  const type = await prisma.partnerType.findUnique({ where: { id: input.partnerTypeId } });
  if (!type || type.status !== "Active") throw new Error("This business type is not accepting registrations.");
  const prefix = type.idPrefix || "VND";
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(prefix)) throw new Error("Invalid account ID prefix configuration.");
  const passwordHash = hashPassword(generatePassword());
  return withRecordLock("signup-prefix", prefix, async () => {
    // Re-read inside the transaction: account, owner and access keys commit together.
    const current = await prisma.partnerType.findUnique({ where: { id: input.partnerTypeId } });
    if (!current || current.status !== "Active" || (current.idPrefix || 'VND') !== prefix) throw new Error("Business type changed. Please reload signup.");
    const modules = Array.isArray(current.defaultModules) ? [...new Set(current.defaultModules.filter((v): v is string => typeof v === 'string'))] : [];
    if (!modules.length || modules.some(slug => !MODULES.some(module => module.slug === slug))) throw new Error("Business modules need administrator configuration.");
    if (input.distributorPartnerId) {
      if (!modules.includes("wholesale-b2b")) throw new Error("The configured dealer business type is missing Wholesale / Distributor B2B.");
      const distributor = await prisma.partner.findUnique({ where: { id: input.distributorPartnerId }, select: { id: true, status: true, partnerTypeId: true } });
      const distributorType = distributor ? await prisma.partnerType.findUnique({ where: { id: distributor.partnerTypeId }, select: { defaultModules: true } }) : null;
      if (!distributor || distributor.status !== "Active" || !Array.isArray(distributorType?.defaultModules) || !distributorType.defaultModules.includes("wholesale-b2b")) throw new Error("The distributor account is not active for dealer onboarding.");
      if (input.referredByPartnerId !== distributor.id || input.referredByStaffId) throw new Error("Dealer referral does not match its distributor invite.");
      if (input.referringDealerCustomerId) {
        const referrer = await prisma.wholesaleCustomer.findFirst({ where: { id: input.referringDealerCustomerId, partnerId: distributor.id, isActive: true } });
        if (!referrer) throw new Error("The referring dealer account is no longer active.");
      }
    }
    // MAX rather than COUNT avoids reusing a remaining ID after earlier accounts are deleted.
    const pattern = `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[0-9]+$`;
    const [sequence] = await prisma.$queryRaw<{ last: string }[]>`SELECT COALESCE(MAX(SUBSTRING(id FROM ${prefix.length + 1}::integer)::numeric), 0)::text AS last FROM partners WHERE id ~ ${pattern}`;
    const scopeKey = `signup-prefix:${prefix}`;
    const counter = await prisma.numberingCounter.findUnique({ where: { scopeKey } });
    const next = (BigInt(sequence.last) > BigInt(counter?.value ?? 0) ? BigInt(sequence.last) : BigInt(counter?.value ?? 0)) + BigInt(1);
    if (next > BigInt(2147483647)) throw new Error("Account ID sequence is exhausted.");
    await prisma.numberingCounter.upsert({ where: { scopeKey }, create: { scopeKey, value: Number(next) }, update: { value: Number(next) } });
    const id = `${prefix}${next.toString().padStart(4, '0')}`;
    const trialStartAt = new Date();
    const trialEndAt = new Date(trialStartAt);
    trialEndAt.setDate(trialEndAt.getDate() + (trialStartAt < new Date('2027-03-01T00:00:00+05:30') ? 15 : 7));
    await prisma.partner.create({ data: {
      id, internalKey: `BIZ002-${id}`, businessId: 'BIZ002', partnerTypeId: current.id,
      businessName: input.businessName, addressLine: input.addressLine, city: input.city, state: input.state,
      pincode: input.pincode, gstin: input.gstin || null, businessEmail: input.businessEmail,
      businessContact: input.businessContact, loginContact: input.loginContact, passwordHash,
      productDomains: parseProductDomains(input.productDomains), customFieldValues: input.customFieldValues ?? {},
      referredByPartnerId: input.referredByPartnerId || null, referredByStaffId: input.referredByStaffId || null,
      trialStartAt, trialEndAt,
    } });
    if (input.distributorPartnerId) {
      const referralCode = `DLR-${randomBytes(5).toString('hex').toUpperCase()}`;
      const dealerCustomer = await prisma.wholesaleCustomer.create({ data: {
        partnerId: input.distributorPartnerId, name: input.businessName, contact: input.businessContact,
        email: input.businessEmail, gstin: input.gstin || null, addressLine: input.addressLine || null,
        city: input.city, state: input.state, pincode: input.pincode, referredByCustomerId: input.referringDealerCustomerId || null,
        referralCode,
      } });
      await prisma.distributorDealerRelationship.create({ data: {
        distributorPartnerId: input.distributorPartnerId, dealerPartnerId: id,
        wholesaleCustomerId: dealerCustomer.id, referrerCustomerId: input.referringDealerCustomerId || null,
      } });
      const referralProgram = await prisma.wholesaleReferralProgram.findUnique({ where: { partnerId: input.distributorPartnerId } });
      if (referralProgram?.enabled) {
        await prisma.wholesaleReferralReward.create({ data: {
          partnerId: input.distributorPartnerId,
          referrerCustomerId: input.referringDealerCustomerId || null,
          recipientType: input.referringDealerCustomerId ? "Dealer" : "Distributor",
          recipientPartnerId: input.referringDealerCustomerId ? null : input.distributorPartnerId,
          referredCustomerId: dealerCustomer.id,
          rewardPercentBps: 500,
          rewardAmount: 0,
          status: "Pending",
        } });
      }
    }
    const roles = Array.isArray(current.assignableRoleIds) ? current.assignableRoleIds : [];
    await prisma.businessRecord.create({ data: { partnerId: id, moduleSlug: 'users', recordKey: 'Owner', data: {
      id: 'Owner', email: input.businessEmail, role: typeof roles[0] === 'string' ? roles[0] : 'Owner / Admin', status: 'Active', lastLogin: '',
    } } });
    await prisma.moduleAccessKey.createMany({ data: modules.map(moduleSlug => ({ partnerId: id, moduleSlug, key: `MBF-${moduleSlug.toUpperCase()}-${randomBytes(6).toString('hex').toUpperCase()}`, status: 'active', note: 'Auto-issued at signup' })) });
    return { id };
  });
}
