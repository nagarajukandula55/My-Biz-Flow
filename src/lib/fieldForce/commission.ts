/**
 * Platform commission — computed against a Booking's finalPrice (falling
 * back to priceAmount) at payment-collection time. This is a ledger
 * computation only: no automated Provider payout exists yet (same honesty
 * precedent as JobAllocation.feeAmount's "not yet billed" stub) — a Super
 * Admin reads providerPayout off the Booking and settles it outside the app.
 */
import { prisma } from "@/lib/prisma";
import { getPlatformFeeConfig } from "@/lib/fieldForce/platformFeeData";

export type Settlement = {
  platformFeeAmount: number;
  customerPayable: number;
  providerPayout: number;
};

export function computeSettlement(
  price: number,
  feeConfig: { isActive: boolean; feeType: string; feeValue: number; chargeParty: string; providerSharePercent: number }
): Settlement {
  if (!feeConfig.isActive) {
    return { platformFeeAmount: 0, customerPayable: price, providerPayout: price };
  }

  const fee = feeConfig.feeType === "percent" ? Math.round((price * feeConfig.feeValue) / 100) : feeConfig.feeValue;

  if (feeConfig.chargeParty === "customer") {
    return { platformFeeAmount: fee, customerPayable: price + fee, providerPayout: price };
  }
  if (feeConfig.chargeParty === "provider") {
    return { platformFeeAmount: fee, customerPayable: price, providerPayout: Math.max(0, price - fee) };
  }

  // both: split the fee — providerSharePercent of it comes off the
  // provider's payout, the rest is added to what the customer pays.
  const providerShare = Math.round((fee * feeConfig.providerSharePercent) / 100);
  const customerShare = fee - providerShare;
  return {
    platformFeeAmount: fee,
    customerPayable: price + customerShare,
    providerPayout: Math.max(0, price - providerShare),
  };
}

/** Computes and persists the settlement for a booking, using its finalPrice (or priceAmount if unset). */
export async function settleBooking(bookingId: string): Promise<Settlement> {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  const feeConfig = await getPlatformFeeConfig();
  const price = booking.finalPrice ?? booking.priceAmount;
  const settlement = computeSettlement(price, feeConfig);

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      platformFeeAmount: settlement.platformFeeAmount,
      customerPayable: settlement.customerPayable,
      providerPayout: settlement.providerPayout,
    },
  });

  return settlement;
}
