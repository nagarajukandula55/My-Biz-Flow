"use server";

import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { assertPageTierAccess } from "@/lib/tenant";

/**
 * Tier-enforced wrappers around the generic createBusinessRecordAction for
 * the two Service Centre catalogs Starter isn't allowed to build (Brands,
 * Models — pro+ only, see DEFAULT_PAGE_TIERS). The standalone /new pages
 * already gate themselves visually via renderTierGate, and the workorder
 * form's inline "+ Add new" modal (serviceCentreCreateFields.ts) doesn't
 * even offer the button on Starter — but neither of those stops a request
 * made directly against the Server Action itself, so the actual write path
 * checks too. Every other module's createBusinessRecordAction usage is
 * unaffected; this is Service-Centre-specific.
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
