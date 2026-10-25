import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";

export async function resolveCompanyPrice(companyId: string, partnerId: string, serviceId: string, identity?: { brand?: string; model?: string; variant?: string }) {
  const company = await prisma.fieldForceCompany.findUniqueOrThrow({ where: { id: companyId } });
  assertPartnerScope(partnerId, company.partnerId);
  if (!identity?.brand || !identity.model || !identity.variant) return null;
  const row = await prisma.fieldForceCompanyPrice.findFirst({
    where: {
      serviceId,
      isActive: true,
      effectiveFrom: { lte: new Date() },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      variant: { companyId, brand: identity.brand, model: identity.model, variant: identity.variant, isActive: true },
    },
    orderBy: { effectiveFrom: "desc" },
  });
  return row;
}

export async function createCompanyVariant(partnerId: string, input: { companyId: string; brand: string; model: string; variant: string }) {
  const company = await prisma.fieldForceCompany.findUniqueOrThrow({ where: { id: input.companyId } });
  assertPartnerScope(partnerId, company.partnerId);
  return prisma.fieldForceCompanyVariant.create({ data: { companyId: input.companyId, brand: input.brand.trim(), model: input.model.trim(), variant: input.variant.trim() } });
}

export async function setCompanyVariantPrice(partnerId: string, input: { variantId: string; serviceId: string; customerPrice: number; providerPayout: number; effectiveFrom?: Date }) {
  const variant = await prisma.fieldForceCompanyVariant.findUniqueOrThrow({ where: { id: input.variantId }, include: { company: true } });
  assertPartnerScope(partnerId, variant.company.partnerId);
  if (input.customerPrice < 0 || input.providerPayout < 0 || input.providerPayout > input.customerPrice) throw new Error("Provider payout must be between zero and the customer price.");
  return prisma.fieldForceCompanyPrice.create({ data: { variantId: input.variantId, serviceId: input.serviceId, customerPrice: input.customerPrice, providerPayout: input.providerPayout, platformMargin: input.customerPrice - input.providerPayout, effectiveFrom: input.effectiveFrom ?? new Date() } });
}
