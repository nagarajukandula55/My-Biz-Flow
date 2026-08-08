import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side pincode lookup via India Post's public API
 * (api.postalpincode.in) — real, live coverage of every Indian pincode,
 * used until central-api's own pincode data is wired up (later phase, per
 * CLAUDE.md). Proxied through our own route so the client never calls a
 * third party directly and so a failure degrades to the manual
 * state-dropdown + city fallback in PincodeLookupFields.tsx.
 */
export async function GET(req: NextRequest) {
  const pincode = req.nextUrl.searchParams.get("code") ?? "";
  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ found: false });

    const data = (await res.json()) as {
      Status: string;
      PostOffice: { State: string; District: string; Name: string }[] | null;
    }[];

    const entry = data[0];
    if (entry?.Status !== "Success" || !entry.PostOffice || entry.PostOffice.length === 0) {
      return NextResponse.json({ found: false });
    }

    const state = entry.PostOffice[0].State;
    const cities = Array.from(new Set(entry.PostOffice.map((po) => po.District))).filter(Boolean);
    const areas = Array.from(new Set(entry.PostOffice.map((po) => po.Name))).filter(Boolean);

    return NextResponse.json({ found: true, state, cities, areas });
  } catch {
    return NextResponse.json({ found: false });
  }
}
