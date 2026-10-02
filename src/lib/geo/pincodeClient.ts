/**
 * One client-side entry point to the existing /api/pincode proxy route
 * (India Post, see src/app/api/pincode/route.ts). Extracted from
 * PincodeLookupFields.tsx so the signup form and the Service Centre
 * workorder intake form resolve a pincode through the SAME mechanism
 * rather than each growing its own copy — there is exactly one
 * pincode-resolution path in the app.
 */
export type PincodeLookupResult = {
  found: boolean;
  state?: string;
  cities?: string[];
  areas?: string[];
};

/**
 * Every Indian state/UT actually present in our postal_pincodes table —
 * the real, current source for a canonical state list (replaces a
 * previous hand-maintained INDIA_STATES_AND_UTS constant, which existed
 * but was never wired into anything). Server-side only (queries Prisma
 * directly); a client component needs this passed down as a prop from its
 * page, same as any other server-fetched data.
 */
export async function listIndiaStates(): Promise<string[]> {
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.postalPincode.findMany({
    select: { state: true },
    distinct: ["state"],
    orderBy: { state: "asc" },
  });
  return rows.map((r) => r.state).filter(Boolean);
}

/**
 * Every district actually present in our postal_pincodes table for the
 * given state(s) — the table has no separate "city" column, only
 * `district` (see PostalPincode in prisma/schema.prisma), which is the
 * same granularity `city` is used at elsewhere in this app (e.g. a
 * partner's own addressLine/city field). Backs a dependent "pick state(s),
 * then pick city/district(s) within them" territory selector (see
 * Telecalling's Agent Territory editor) instead of one unscoped flat city
 * list. Empty `states` returns every district regardless of state (used
 * before any state is picked yet).
 */
export async function listCitiesForStates(states: string[]): Promise<string[]> {
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.postalPincode.findMany({
    where: states.length > 0 ? { state: { in: states } } : undefined,
    select: { district: true },
    distinct: ["district"],
    orderBy: { district: "asc" },
  });
  return rows.map((r) => r.district).filter(Boolean);
}

/** Returns `{ found: false }` on any failure — a lookup must never block manual entry. */
export async function lookupPincodeViaApi(pincode: string): Promise<PincodeLookupResult> {
  if (!/^\d{6}$/.test(pincode)) return { found: false };
  try {
    const res = await fetch(`/api/pincode?code=${pincode}`);
    const data = (await res.json()) as PincodeLookupResult;
    if (data.found && data.state && data.cities?.length) return data;
    return { found: false };
  } catch {
    return { found: false };
  }
}
