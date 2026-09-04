/**
 * Pure matching logic — no charging, no side effects. Used by the
 * allocations page to narrow the engineer pool for one job down to
 * candidates who actually cover it.
 */
import type { EngineerRecord } from "./engineersData";

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

export function findEligibleEngineers(
  engineers: EngineerRecord[],
  job: { pincode: string; state?: string; district?: string; requiredServiceIds: string[] }
): EngineerRecord[] {
  return engineers.filter((e) => {
    if (e.status !== "active") return false;

    const hasAllServices = job.requiredServiceIds.every((id) => e.services.some((s) => s.id === id));
    if (!hasAllServices) return false;

    return e.serviceAreas.some((area) =>
      areaCoversPincode(area, job.pincode, job.state, job.district)
    );
  });
}
