/**
 * Universal-login module routing. A Partner ID's prefix already encodes
 * its business type (SC0001 -> the "service-centre" PartnerType, FF0001
 * -> "field-force", etc. — see PartnerType.idPrefix in
 * src/lib/designer/partnerTypesData.ts and nextPartnerId() in
 * partnerData.ts, the existing source of truth this reuses rather than
 * duplicating as a second hardcoded prefix map).
 *
 * Every PartnerType already lists its `defaultModules` — the modules a
 * partner of that type gets. This treats the FIRST entry as that type's
 * home/primary module, so logging in with any partner id lands the user
 * directly in the one module their business type is built around,
 * instead of a generic dashboard they'd have to navigate away from
 * every time. Falls back to /partner/{id}/dashboard only if a type has
 * no configured modules at all (misconfiguration, not the normal path).
 */
import { getPartnerType } from "@/lib/designer/partnerTypesData";
import type { PartnerRecord } from "@/lib/partnerData";

export async function getPartnerHomePath(partner: Pick<PartnerRecord, "id" | "partnerTypeId">): Promise<string> {
  const partnerType = await getPartnerType(partner.partnerTypeId);
  const homeModule = partnerType?.defaultModules?.[0];
  return homeModule ? `/partner/${partner.id}/${homeModule}` : `/partner/${partner.id}/dashboard`;
}
