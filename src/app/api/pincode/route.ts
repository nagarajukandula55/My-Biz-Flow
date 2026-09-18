import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Server-side pincode lookup. Our own `PostalPincode` table (seeded from
 * the official All India Pincode Directory, see scripts/syncPincodes.ts)
 * is checked first — fast, no external dependency, and covers offline/API
 * outages. Falls back to India Post's live public API
 * (api.postalpincode.in) when a pincode isn't in our table yet (not
 * synced, or newly issued). Proxied through our own route so the client
 * never calls a third party directly and so a failure degrades to the
 * manual state-dropdown + city fallback in PincodeLookupFields.tsx.
 */
export async function GET(req: NextRequest) {
  const pincode = req.nextUrl.searchParams.get("code") ?? "";
  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  const fromTable = await lookupFromTable(pincode);
  if (fromTable) return NextResponse.json(fromTable);

  return NextResponse.json(await lookupFromLiveApi(pincode));
}

async function lookupFromTable(pincode: string) {
  try {
    const rows = await prisma.postalPincode.findMany({ where: { pincode } });
    if (rows.length === 0) return null;

    const state = rows[0].state;
    const cities = Array.from(new Set(rows.map((r) => r.district))).filter(Boolean);
    const areas = Array.from(new Set(rows.map((r) => r.officeName))).filter(Boolean);

    return { found: true, state, cities, areas, source: "table" as const };
  } catch {
    return null;
  }
}

async function lookupFromLiveApi(pincode: string) {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      cache: "no-store",
    });
    if (!res.ok) return { found: false };

    const data = (await res.json()) as {
      Status: string;
      PostOffice: { State: string; District: string; Name: string }[] | null;
    }[];

    const entry = data[0];
    if (entry?.Status !== "Success" || !entry.PostOffice || entry.PostOffice.length === 0) {
      return { found: false };
    }

    const state = entry.PostOffice[0].State;
    const cities = Array.from(new Set(entry.PostOffice.map((po) => po.District))).filter(Boolean);
    const areas = Array.from(new Set(entry.PostOffice.map((po) => po.Name))).filter(Boolean);

    return { found: true, state, cities, areas, source: "live-api" as const };
  } catch {
    return { found: false };
  }
}
