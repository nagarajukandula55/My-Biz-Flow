import { NextResponse } from "next/server";
import { getPartner } from "@/lib/partnerData";
import { computePartnerDueAmount } from "@/lib/subscriptionData";
import { createOrder } from "@/lib/razorpay";
import { getSessionPartnerId } from "@/lib/requirePartnerSession";

/**
 * Creates a Razorpay Order for the calling partner's currently chosen
 * plan+cycle+offer. partnerId comes from the signed-in session cookie, not
 * the request body — previously any caller could pass an arbitrary
 * partnerId here and probe another partner's due amount/plan (the payment
 * itself was still safe since verify/ separately checks the Razorpay
 * signature, but this endpoint alone leaked billing info cross-tenant).
 */
export async function POST() {
  const partnerId = await getSessionPartnerId();
  if (!partnerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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
