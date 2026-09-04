import { NextResponse } from "next/server";
import { getPartner } from "@/lib/partnerData";
import { computePartnerDueAmount } from "@/lib/subscriptionData";
import { createOrder } from "@/lib/razorpay";

/** Creates a Razorpay Order for the calling partner's currently chosen plan+cycle+offer. */
export async function POST(request: Request) {
  const { partnerId } = await request.json();
  if (!partnerId) return NextResponse.json({ error: "partnerId is required" }, { status: 400 });

  const partner = await getPartner(partnerId);
  if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

  const due = await computePartnerDueAmount(partner);
  if (!due) return NextResponse.json({ error: "No plan/billing cycle chosen yet" }, { status: 400 });

  try {
    const order = await createOrder(due.amount * 100, `${partner.id}-${Date.now()}`, {
      partnerId: partner.id,
      planId: partner.planId ?? "",
      billingCycle: partner.billingCycle ?? "",
    });
    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, planName: due.planName });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Order creation failed" }, { status: 502 });
  }
}
