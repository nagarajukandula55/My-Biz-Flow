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
