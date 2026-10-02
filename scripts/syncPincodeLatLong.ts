/**
 * Backfills latitude/longitude onto the existing postal_pincodes rows
 * (see PostalPincode in prisma/schema.prisma — added for Field Force's
 * distance-based engineer matching, src/lib/fieldForce/geo.ts). Does NOT
 * insert new pincode rows or touch pincode/officeName/district/state —
 * this only ever runs `UPDATE ... SET latitude, longitude` against
 * pincodes that already exist in our table from scripts/syncPincodes.ts,
 * using the pincode as the join key.
 *
 * Source: GeoNames' free, no-signup-required postal code export
 * (download.geonames.org/export/zip/IN.zip, CC BY 4.0 — see geonames.org
 * for attribution terms). India's official pincode directory (data.gov.in)
 * doesn't carry coordinates in its free tier; GeoNames is a widely-used,
 * no-API-key alternative that does. Format: tab-separated, one row per
 * (pincode, place name) pair — several places can share one pincode, each
 * with its own lat/long, so this averages all of a pincode's GeoNames rows
 * into a single representative point before writing it (good enough for
 * dispatch-distance purposes; not survey-grade precision).
 *
 * Usage: DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx tsx scripts/syncPincodeLatLong.ts
 */
import JSZip from "jszip";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const GEONAMES_URL = "https://download.geonames.org/export/zip/IN.zip";
const BATCH_SIZE = 1000;

type Coord = { latSum: number; lonSum: number; count: number };

async function fetchGeonamesCoordsByPincode(): Promise<Map<string, { lat: number; lon: number }>> {
  console.log(`Fetching ${GEONAMES_URL}...`);
  const res = await fetch(GEONAMES_URL);
  if (!res.ok) throw new Error(`Failed to fetch GeoNames export: ${res.status} ${res.statusText}`);
  const buffer = await res.arrayBuffer();

  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file("IN.txt");
  if (!entry) throw new Error("IN.txt not found inside the downloaded zip — GeoNames may have changed its file layout.");
  const text = await entry.async("text");

  // Columns: country, postal code, place name, admin name1, admin code1,
  // admin name2, admin code2, admin name3, admin code3, latitude,
  // longitude, accuracy.
  const sums = new Map<string, Coord>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols = line.split("\t");
    const pincode = cols[1]?.trim();
    const lat = Number(cols[9]);
    const lon = Number(cols[10]);
    if (!pincode || !/^\d{6}$/.test(pincode) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const entry = sums.get(pincode) ?? { latSum: 0, lonSum: 0, count: 0 };
    entry.latSum += lat;
    entry.lonSum += lon;
    entry.count += 1;
    sums.set(pincode, entry);
  }

  const result = new Map<string, { lat: number; lon: number }>();
  for (const [pincode, { latSum, lonSum, count }] of sums) {
    result.set(pincode, { lat: latSum / count, lon: lonSum / count });
  }
  return result;
}

async function main() {
  const coordsByPincode = await fetchGeonamesCoordsByPincode();
  console.log(`Parsed coordinates for ${coordsByPincode.size} unique pincodes from GeoNames.`);

  const existingPincodes = await prisma.postalPincode.findMany({
    select: { pincode: true },
    distinct: ["pincode"],
  });
  console.log(`${existingPincodes.length} distinct pincodes already in postal_pincodes.`);

  const toUpdate = existingPincodes
    .map((row) => ({ pincode: row.pincode, coord: coordsByPincode.get(row.pincode) }))
    .filter((row): row is { pincode: string; coord: { lat: number; lon: number } } => Boolean(row.coord));
  console.log(`${toUpdate.length} of those have a GeoNames match — updating in batches of ${BATCH_SIZE}...`);

  let done = 0;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);
    const values = Prisma.join(batch.map((row) => Prisma.sql`(${row.pincode}, ${row.coord.lat}, ${row.coord.lon})`));
    await prisma.$executeRaw`
      UPDATE "postal_pincodes" AS p
      SET "latitude" = v.lat, "longitude" = v.lon, "updatedAt" = now()
      FROM (VALUES ${values}) AS v(pincode, lat, lon)
      WHERE p."pincode" = v.pincode;
    `;
    done += batch.length;
    console.log(`  ${done}/${toUpdate.length} pincodes updated...`);
  }

  const unmatched = existingPincodes.length - toUpdate.length;
  if (unmatched > 0) {
    console.log(`${unmatched} pincode(s) in our table had no GeoNames match — left as-is (distance matching degrades gracefully for these, see geo.ts).`);
  }
  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
