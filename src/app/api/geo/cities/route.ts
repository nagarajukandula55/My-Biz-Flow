import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cities/districts for a given state, from our own postal_pincodes table —
 * the middle level of the Service Area picker's State -> City -> Pincode
 * tree (src/components/ServiceAreaPicker.tsx). Lazy-loaded per state on
 * expand, not preloaded, since the table has ~150k rows.
 */
export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state") ?? "";
  if (!state) return NextResponse.json({ cities: [] }, { status: 400 });

  const rows = await prisma.postalPincode.findMany({
    where: { state },
    select: { district: true },
    distinct: ["district"],
    orderBy: { district: "asc" },
  });

  return NextResponse.json({ cities: rows.map((r) => r.district).filter(Boolean) });
}
