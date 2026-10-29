import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cronAuthorization";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { processWorkflowActionLogs } from "@/lib/workflowAutomation";

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), env.cronSecret())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partners = await prisma.partner.findMany({ select: { id: true } });
  const partnerIds = partners.map(partner => partner.id);
  const results = await Promise.all(partnerIds.map(partnerId => processWorkflowActionLogs(partnerId)));
  return NextResponse.json({ partners: partnerIds.length, results });
}
