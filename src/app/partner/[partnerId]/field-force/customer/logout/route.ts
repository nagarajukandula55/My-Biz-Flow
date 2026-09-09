import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/fieldForce/customerAuth";

export async function GET(request: Request, { params }: { params: { partnerId: string } }) {
  cookies().delete(CUSTOMER_SESSION_COOKIE);
  return NextResponse.redirect(new URL(`/partner/${params.partnerId}/field-force/customer/login`, request.url));
}
