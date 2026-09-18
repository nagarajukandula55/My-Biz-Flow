/**
 * Auto-assigns a public Book Appointment inquiry to a Service Centre
 * partner, based on the areas each partner has configured in Settings →
 * Service Centre → Service Area (Partner.serviceCentrePincodes /
 * serviceCentreServiceTypes). Match order, per explicit direction:
 * pincode first, falling back to city, then falling back to state — so an
 * inquiry is never left unassigned just because a partner's coverage list
 * is sparse.
 *
 * Only partners offering the requested service type are considered at
 * every fallback level; a partner who hasn't configured any pincodes yet
 * is only reachable via the city/state fallback (never a pincode match).
 */
import { listPartners, type PartnerRecord } from "@/lib/partnerData";

export type InquiryAssignmentMatch = {
  partner: PartnerRecord;
  matchedOn: "pincode" | "city" | "state";
};

export async function findPartnerForInquiry(input: {
  serviceType: string;
  pincode: string;
  city?: string;
  state?: string;
}): Promise<InquiryAssignmentMatch | undefined> {
  const partners = await listPartners();
  const eligible = partners.filter((p) => p.serviceCentreServiceTypes.includes(input.serviceType));
  if (eligible.length === 0) return undefined;

  const byPincode = eligible.find((p) => p.serviceCentrePincodes.includes(input.pincode));
  if (byPincode) return { partner: byPincode, matchedOn: "pincode" };

  if (input.city) {
    const byCity = eligible.find((p) => p.city.trim().toLowerCase() === input.city!.trim().toLowerCase());
    if (byCity) return { partner: byCity, matchedOn: "city" };
  }

  if (input.state) {
    const byState = eligible.find((p) => p.state.trim().toLowerCase() === input.state!.trim().toLowerCase());
    if (byState) return { partner: byState, matchedOn: "state" };
  }

  return undefined;
}
