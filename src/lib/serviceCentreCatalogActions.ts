"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord } from "@/lib/businessRecords";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { assertPageTierAccess } from "@/lib/tenant";
import { getPartner } from "@/lib/partnerData";
import { parseProductDomains } from "@/lib/catalog/productDomains";

/** This partner's own declared domain, defaulting to ELECTRONICS — same fallback as every other undeclared legacy catalog row (see brandRowDomain in service-centre-brands.ts). */
async function primaryDomainFor(partnerId: string): Promise<"ELECTRONICS" | "AUTOMOBILE"> {
  const partner = await getPartner(partnerId);
  const domains = parseProductDomains(partner?.productDomains);
  return domains.includes("AUTOMOBILE") && !domains.includes("ELECTRONICS") ? "AUTOMOBILE" : "ELECTRONICS";
}

/**
 * Tier-enforced wrappers around the generic createBusinessRecordAction for
 * the three Service Centre catalogs Starter isn't allowed to build (Brands,
 * Models, BOM Materials — pro+ only, see DEFAULT_PAGE_TIERS). The standalone
 * /new pages already gate themselves visually via renderTierGate, and the
 * inline "+ Add new" modals (serviceCentreCreateFields.ts, and the
 * WorkorderLifecycle Brand/Model pickers) don't even offer the button on
 * Starter — but neither of those stops a request made directly against the
 * Server Action itself, so the actual write path checks too. Every other
 * module's createBusinessRecordAction usage is unaffected; this is
 * Service-Centre-specific.
 *
 * Two variants of each: the REDIRECTING ones below (used by the standalone
 * /brands/new, /models/new, /bom/new pages, where navigating to the new
 * record's own detail page after creating it is exactly what should
 * happen) and the INLINE ones further down (used by any "+ Add new" modal
 * opened FROM another form — the new-workorder form, or the workorder
 * repair page's Brand/Model pickers — where redirecting would navigate the
 * user away from whatever they were filling in, silently discarding it).
 */
export async function createServiceCentreBrandAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  await assertPageTierAccess(partnerId, "service-centre.brands.create");
  await createBusinessRecordAction(partnerId, "service-centre-brands", values);
}

export async function createServiceCentreModelAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  await assertPageTierAccess(partnerId, "service-centre.models.create");
  await createBusinessRecordAction(partnerId, "service-centre-models", values);
}

export async function createServiceCentreBomMaterialAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  await assertPageTierAccess(partnerId, "inventory.bom.create");
  await createBusinessRecordAction(partnerId, "inventory-bom", values);
}

export type InlineCreateResult = { error?: string; id?: string; label?: string };

/**
 * Creates the record and returns its new id/label — never redirects, so the
 * caller's own in-progress form (a workorder, another modal) stays exactly
 * as it was. `domain`/`status` are filled in here when the caller doesn't
 * supply them (the repair-page quick-add is a single name field, unlike the
 * standalone /new form which asks for domain explicitly) so every row still
 * carries the required tag described in service-centre-brands.ts.
 */
export async function createServiceCentreBrandInlineAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<InlineCreateResult> {
  await assertPageTierAccess(partnerId, "service-centre.brands.create");
  const domain = values.domain ?? (await primaryDomainFor(partnerId));
  const record = await createBusinessRecord(partnerId, "service-centre-brands", {
    status: "Active",
    ...values,
    domain,
  });
  revalidatePath(`/partner/${partnerId}/service-centre/brands`);
  return { id: String(record.id), label: String(record["name"] ?? record.id) };
}

export async function createServiceCentreModelInlineAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<InlineCreateResult> {
  await assertPageTierAccess(partnerId, "service-centre.models.create");
  const domain = values.domain ?? (await primaryDomainFor(partnerId));
  const record = await createBusinessRecord(partnerId, "service-centre-models", {
    status: "Active",
    ...values,
    domain,
  });
  revalidatePath(`/partner/${partnerId}/service-centre/models`);
  return { id: String(record.id), label: String(record["name"] ?? record.id) };
}

/**
 * Solutions has no tier gate (Basic can already create them via the full
 * /solutions/new form) — this inline variant exists purely so the
 * workorder repair page's "+ Add Solution" quick-add modal doesn't
 * navigate away, same reasoning as the Brand/Model/BOM inline actions
 * above, just without an assertPageTierAccess call.
 */
export async function createServiceCentreSolutionInlineAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<InlineCreateResult> {
  const record = await createBusinessRecord(partnerId, "service-centre-solutions", {
    status: "Active",
    category: "Other",
    ...values,
  });
  revalidatePath(`/partner/${partnerId}/service-centre/solutions`);
  return { id: String(record.id), label: String(record["title"] ?? record.id) };
}

export async function createServiceCentreBomMaterialInlineAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<InlineCreateResult> {
  await assertPageTierAccess(partnerId, "inventory.bom.create");
  const record = await createBusinessRecord(partnerId, "inventory-bom", values);
  revalidatePath(`/partner/${partnerId}/inventory/bom`);
  return { id: String(record.id), label: String(record["description"] ?? record.id) };
}
