import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cronAuthorization";
import { env } from "@/lib/env";
import { retryExpiredBookingOffers } from "@/lib/fieldForce/matchingEngine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), env.cronSecret())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const retried = await retryExpiredBookingOffers();
  return NextResponse.json({ ok: true, retried });
}
