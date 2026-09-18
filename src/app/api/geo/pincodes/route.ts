import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Pincodes for a given state+city/district, from our own postal_pincodes
 * table — the leaf level of the Service Area picker's State -> City ->
 * Pincode tree (src/components/ServiceAreaPicker.tsx). A district can
 * carry duplicate pincodes across multiple post offices/localities, so
 * this returns the distinct pincode list only (not every office row) —
 * picking a pincode covers every locality/office under it.
 */
export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const city = req.nextUrl.searchParams.get("city") ?? "";
  if (!state || !city) return NextResponse.json({ pincodes: [] }, { status: 400 });

  const rows = await prisma.postalPincode.findMany({
    where: { state, district: city },
    select: { pincode: true },
    distinct: ["pincode"],
    orderBy: { pincode: "asc" },
  });

  return NextResponse.json({ pincodes: rows.map((r) => r.pincode) });
}
