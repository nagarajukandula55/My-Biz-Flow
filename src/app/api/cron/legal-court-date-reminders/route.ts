import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cronAuthorization";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { sendUpcomingLegalCourtDateReminders } from "@/lib/legal";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), env.cronSecret())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partners = await prisma.partner.findMany({ select: { id: true } });
  const counts = await Promise.all(partners.map(partner => sendUpcomingLegalCourtDateReminders(partner.id).catch(() => 0)));
  return NextResponse.json({ partners: partners.length, delivered: counts.reduce((sum, count) => sum + count, 0) });
}
