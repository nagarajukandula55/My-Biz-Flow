"use server";

import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { requestWalletWithdrawal } from "@/lib/walletClient";
import { env } from "@/lib/env";

/** Requests a withdrawal from the signed-in partner owner's own ANy Pay wallet. Never trusts a client-supplied owner id. */
export async function withdrawPartnerWalletAction(partnerId: string, amount: number): Promise<{ ok: boolean; error?: string }> {
  if (!env.walletWithdrawalEnabled()) {
    return { ok: false, error: "Withdrawals aren't open yet — your balance is still accruing." };
  }
  const sessionPartnerId = await requireSessionPartnerId(partnerId);
  const result = await requestWalletWithdrawal("PARTNER", sessionPartnerId, amount);
  return { ok: result.ok, error: result.error };
}
