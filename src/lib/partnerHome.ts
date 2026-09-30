/**
 * Universal-login module routing. A Partner ID's prefix already encodes
 * its business type (SC0001 -> the "service-centre" PartnerType, FF0001
 * -> "field-force", etc. — see PartnerType.idPrefix in
 * src/lib/designer/partnerTypesData.ts and nextPartnerId() in
 * partnerData.ts, the existing source of truth this reuses rather than
 * duplicating as a second hardcoded prefix map).
 *
 * Every PartnerType already lists its `defaultModules` — the modules a
 * partner of that type gets. This uses the first recognized entry with an active access key as that type's
 * home/primary module, so logging in with any partner id lands the user
 * directly in the one module their business type is built around,
 * instead of a generic dashboard they'd have to navigate away from
 * every time. Falls back to /partner/{id}/dashboard only if a type has
 * no accessible configured modules.
 */
import { getPartnerType } from "@/lib/designer/partnerTypesData";
import type { PartnerRecord } from "@/lib/partnerData";
import { getPartnerEntitlements } from "@/lib/designer/accessKeys";
import { getModule } from "@/lib/designer/modules";

export async function getPartnerHomePath(partner: Pick<PartnerRecord, "id" | "partnerTypeId">): Promise<string> {
  const [partnerType, entitlements] = await Promise.all([
    getPartnerType(partner.partnerTypeId), getPartnerEntitlements(partner.id),
  ]);
  const homeModule = partnerType?.defaultModules?.find((slug) => entitlements.includes(slug) && getModule(slug));
  return homeModule ? `/partner/${partner.id}/${homeModule}` : `/partner/${partner.id}/dashboard`;
}
