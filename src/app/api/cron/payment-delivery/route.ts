import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cronAuthorization";
import { env } from "@/lib/env";
import { processPaymentDelivery } from "@/lib/paymentDeliveryQueue";
import { sendPaymentDelivery } from "@/lib/subscriptionPaymentReceipt";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), env.cronSecret())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let processed = 0;
  // Small bounded batch; ambiguous attempts require Admin review rather than blind resending.
  while (processed < 3 && await processPaymentDelivery(sendPaymentDelivery)) processed++;
  return NextResponse.json({ processed });
}
