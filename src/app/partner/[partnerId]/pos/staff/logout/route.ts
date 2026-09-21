import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { POS_STAFF_SESSION_COOKIE } from "@/lib/pos/posAuth";

export async function GET(request: Request, { params }: { params: { partnerId: string } }) {
  cookies().delete(POS_STAFF_SESSION_COOKIE);
  return NextResponse.redirect(new URL(`/partner/${params.partnerId}/pos/staff/login`, request.url));
}
