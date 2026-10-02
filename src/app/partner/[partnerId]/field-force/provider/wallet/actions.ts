"use server";

import { getCurrentProvider } from "@/lib/fieldForce/providerAuth";
import { requestWalletWithdrawal } from "@/lib/walletClient";
import { env } from "@/lib/env";

/** Requests a withdrawal from the signed-in engineer's own wallet. Never trusts a client-supplied owner id. */
export async function withdrawProviderWalletAction(partnerId: string, amount: number): Promise<{ ok: boolean; error?: string }> {
  if (!env.walletWithdrawalEnabled()) {
    return { ok: false, error: "Withdrawals aren't open yet — settlement is still manual for completed jobs." };
  }
  const provider = await getCurrentProvider(partnerId);
  if (!provider) {
    return { ok: false, error: "Not signed in." };
  }
  const result = await requestWalletWithdrawal("FIELD_FORCE_PROVIDER", provider.id, amount);
  return { ok: result.ok, error: result.error };
}
