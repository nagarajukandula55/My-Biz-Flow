import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cronAuthorization";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { sendUpcomingEventReminders } from "@/lib/eventBooking";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), env.cronSecret())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partners = await prisma.partner.findMany({ select: { id: true } });
  const counts = await Promise.all(partners.map(partnerId => sendUpcomingEventReminders(partnerId.id).catch(() => 0)));
  return NextResponse.json({ partners: partners.length, delivered: counts.reduce((sum, count) => sum + count, 0) });
}
