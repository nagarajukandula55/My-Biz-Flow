/**
 * Pincode-distance helpers for Field Force dispatch — picks the nearest
 * eligible Provider to a job by great-circle distance between the job's
 * pincode and each candidate's own pincode, using PostalPincode.latitude/
 * longitude (prisma/schema.prisma). Those columns are nullable and start
 * out empty for most rows until a lat/long sync has been run (see that
 * model's own doc comment) — every function here degrades gracefully to
 * "distance unknown" rather than throwing, so dispatch keeps working off
 * the existing pincode/state/district matching (matching.ts) in the
 * meantime.
 */
import { prisma } from "@/lib/prisma";
import type { ProviderRecord } from "./providersData";

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle (haversine) distance in km between two lat/long points. */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Coordinates for a set of pincodes, one row per pincode with lat/long set
 * (a pincode can have multiple PostalPincode rows — one per post office —
 * so this averages them into a single representative point per pincode,
 * close enough for dispatch-distance purposes without needing office-level
 * precision).
 */
export async function getPincodeCoordinates(pincodes: string[]): Promise<Map<string, { lat: number; lon: number }>> {
  const uniquePincodes = Array.from(new Set(pincodes.filter(Boolean)));
  if (uniquePincodes.length === 0) return new Map();

  const rows = await prisma.postalPincode.findMany({
    where: { pincode: { in: uniquePincodes }, latitude: { not: null }, longitude: { not: null } },
    select: { pincode: true, latitude: true, longitude: true },
  });

  const sums = new Map<string, { latSum: number; lonSum: number; count: number }>();
  for (const row of rows) {
    if (row.latitude == null || row.longitude == null) continue;
    const entry = sums.get(row.pincode) ?? { latSum: 0, lonSum: 0, count: 0 };
    entry.latSum += row.latitude;
    entry.lonSum += row.longitude;
    entry.count += 1;
    sums.set(row.pincode, entry);
  }

  const result = new Map<string, { lat: number; lon: number }>();
  for (const [pincode, { latSum, lonSum, count }] of sums) {
    result.set(pincode, { lat: latSum / count, lon: lonSum / count });
  }
  return result;
}

/** Distance in km from `jobPincode` to `candidatePincode`, or undefined if either pincode has no known coordinates yet. */
export async function distanceBetweenPincodesKm(jobPincode: string, candidatePincode: string): Promise<number | undefined> {
  const coords = await getPincodeCoordinates([jobPincode, candidatePincode]);
  const job = coords.get(jobPincode);
  const candidate = coords.get(candidatePincode);
  if (!job || !candidate) return undefined;
  return haversineDistanceKm(job.lat, job.lon, candidate.lat, candidate.lon);
}

/**
 * Distance in km from `jobPincode` to each of `candidatePincodes`, in one
 * batched coordinate lookup — the shape the Allocations page and the
 * auto-dispatch engine both need (many candidates, one job pincode).
 * A candidate pincode with no known coordinates maps to `undefined`
 * (shown as "distance unknown" rather than excluded).
 */
export async function distancesFromPincode(
  jobPincode: string,
  candidatePincodes: string[]
): Promise<Map<string, number | undefined>> {
  const coords = await getPincodeCoordinates([jobPincode, ...candidatePincodes]);
  const job = coords.get(jobPincode);
  const result = new Map<string, number | undefined>();
  for (const pincode of candidatePincodes) {
    const candidate = coords.get(pincode);
    result.set(pincode, job && candidate ? haversineDistanceKm(job.lat, job.lon, candidate.lat, candidate.lon) : undefined);
  }
  return result;
}

export type ProviderWithDistance = { provider: ProviderRecord; distanceKm: number | undefined };

/**
 * Attaches a distanceKm to each already-eligible provider (see
 * findEligibleProviders in matching.ts — call that first to narrow the
 * pool, then this to rank it) and sorts nearest-first. Providers with
 * unknown distance (no lat/long data yet) sort to the end rather than
 * being dropped — "nearest known" beats "no information", but a candidate
 * is never excluded just because the coordinate backfill hasn't reached
 * their pincode yet.
 */
export async function rankProvidersByDistance(jobPincode: string, providers: ProviderRecord[]): Promise<ProviderWithDistance[]> {
  const distances = await distancesFromPincode(
    jobPincode,
    providers.map((p) => p.pincode)
  );
  return providers
    .map((provider) => ({ provider, distanceKm: distances.get(provider.pincode) }))
    .sort((a, b) => {
      if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
      if (a.distanceKm === undefined) return 1;
      if (b.distanceKm === undefined) return -1;
      return a.distanceKm - b.distanceKm;
    });
}
