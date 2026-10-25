import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isAuthorizedCronRequest } from "@/lib/cronAuthorization";
import { monitorFieldForceSlas } from "@/lib/fieldForce/slaMonitor";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), env.cronSecret())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await monitorFieldForceSlas());
}
