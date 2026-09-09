import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROVIDER_SESSION_COOKIE } from "@/lib/fieldForce/providerAuth";

export async function GET(request: Request, { params }: { params: { partnerId: string } }) {
  cookies().delete(PROVIDER_SESSION_COOKIE);
  return NextResponse.redirect(new URL(`/partner/${params.partnerId}/field-force/provider/login`, request.url));
}
