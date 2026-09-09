/**
 * Pure matching logic — no charging, no side effects. Used by the automated
 * dispatch engine (matchingEngine.ts) and the manual Allocations page to
 * narrow the Provider pool for one job down to candidates who actually
 * cover it.
 */
import type { ProviderRecord } from "./providersData";

function areaCoversPincode(
  area: { state: string; district?: string; locality?: string; pincode?: string },
  jobPincode: string,
  jobState?: string,
  jobDistrict?: string
): boolean {
  if (area.pincode) return area.pincode === jobPincode;
  if (!jobState || area.state !== jobState) return false;
  if (area.district && jobDistrict) return area.district === jobDistrict;
  // A state-only or locality-only row (no district match required/given)
  // still counts as coverage within that state.
  return true;
}

export function findEligibleProviders(
  providers: ProviderRecord[],
  job: { pincode: string; state?: string; district?: string; requiredServiceIds: string[] }
): ProviderRecord[] {
  return providers.filter((p) => {
    if (p.status !== "active") return false;

    const hasAllServices = job.requiredServiceIds.every((id) => p.services.some((s) => s.id === id));
    if (!hasAllServices) return false;

    if (p.pincode === job.pincode) return true;
    return p.serviceAreas.some((area) => areaCoversPincode(area, job.pincode, job.state, job.district));
  });
}
