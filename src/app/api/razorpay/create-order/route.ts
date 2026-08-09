import { NextResponse } from "next/server";
import { getVendor } from "@/lib/vendorData";
import { computeVendorDueAmount } from "@/lib/subscriptionData";
import { createOrder } from "@/lib/razorpay";

/** Creates a Razorpay Order for the calling vendor's currently chosen plan+cycle+offer. */
export async function POST(request: Request) {
  const { vendorId } = await request.json();
  if (!vendorId) return NextResponse.json({ error: "vendorId is required" }, { status: 400 });

  const vendor = await getVendor(vendorId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const due = await computeVendorDueAmount(vendor);
  if (!due) return NextResponse.json({ error: "No plan/billing cycle chosen yet" }, { status: 400 });

  try {
    const order = await createOrder(due.amount * 100, `${vendor.id}-${Date.now()}`, {
      vendorId: vendor.id,
      planId: vendor.planId ?? "",
      billingCycle: vendor.billingCycle ?? "",
    });
    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, planName: due.planName });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Order creation failed" }, { status: 502 });
  }
}
