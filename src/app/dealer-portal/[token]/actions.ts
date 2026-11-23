"use server";

import { verifyDealerPortalToken } from "@/lib/dealerPortal";
import { checkCreditLimit, createWholesaleOrder, getWholesaleCustomer, resolveWholesaleOrderLines, type WholesaleOrderLineInput } from "@/lib/wholesaleData";
import { prisma } from "@/lib/prisma";

export async function placeDealerOrderAction(token: string, items: Array<{ productId: string; quantity: number }>): Promise<{ error?: string; orderNumber?: string }> {
  try {
    const claims = await verifyDealerPortalToken(token);
    const customer = await getWholesaleCustomer(claims.partnerId, claims.customerId);
    if (!customer?.isActive) return { error: "This dealer account is inactive. Contact your distributor." };
    if (!Array.isArray(items) || items.length < 1 || items.length > 100) return { error: "Select between 1 and 100 products." };
    const lines: WholesaleOrderLineInput[] = items.map((item) => ({ productId: String(item.productId ?? ""), materialId: "", materialLabel: "", quantity: Number(item.quantity), unitPrice: 0 }));
    const resolved = await resolveWholesaleOrderLines(claims.partnerId, customer.id, customer.defaultPriceTierId, lines);
    const credit = await checkCreditLimit(claims.partnerId, customer.id, resolved.pricing.totalAmount);
    if (!credit.ok) return { error: credit.error };
    const relationship = await prisma.distributorDealerRelationship.findUnique({ where: { wholesaleCustomerId: customer.id }, select: { dealerPartnerId: true } });
    const order = await createWholesaleOrder(claims.partnerId, { customerId: customer.id, priceTierId: resolved.tierId, orderDate: new Date(), lines: resolved.lines, source: relationship ? "DealerWorkspace" : "DealerPortal", requestedByDealerPartnerId: relationship?.dealerPartnerId ?? null });
    return { orderNumber: order.orderNumber };
  } catch (error) { return { error: error instanceof Error ? error.message : "We could not submit the order. Please contact your distributor." }; }
}

export async function submitDealerOrderRequest(token: string, formData: FormData) {
  const claims = await verifyDealerPortalToken(token);
  const material = String(formData.get("material") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim();
  if (!material || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || notes.length > 2000) throw new Error("Enter a valid material, quantity and notes.");
  const customer = await prisma.wholesaleCustomer.findFirst({ where: { id: claims.customerId, partnerId: claims.partnerId, isActive: true }, select: { id: true } });
  if (!customer) throw new Error("This dealer account is no longer active.");
  await prisma.businessRecord.create({ data: { id: crypto.randomUUID(), partnerId: claims.partnerId, moduleSlug: "dealer-order-request", recordKey: crypto.randomUUID(), data: { customerId: claims.customerId, material, quantity, notes, status: "Open", source: "dealer-portal", createdAt: new Date().toISOString() } } });
}
