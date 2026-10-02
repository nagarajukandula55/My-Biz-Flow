"use server";

import { getStaffSession } from "@/lib/requirePartnerSession";
import { requestWalletWithdrawal } from "@/lib/walletClient";
import { env } from "@/lib/env";

/** Requests a withdrawal from the signed-in telecalling agent's own ANy Pay wallet. Never trusts a client-supplied owner id. */
export async function withdrawAgentWalletAction(partnerId: string, amount: number): Promise<{ ok: boolean; error?: string }> {
  if (!env.walletWithdrawalEnabled()) {
    return { ok: false, error: "Withdrawals aren't open yet — your balance is still accruing." };
  }
  const session = await getStaffSession();
  if (!session || session.partnerId !== partnerId) {
    return { ok: false, error: "Not signed in." };
  }
  const result = await requestWalletWithdrawal("TELECALLING_AGENT", session.staffId, amount);
  return { ok: result.ok, error: result.error };
}
