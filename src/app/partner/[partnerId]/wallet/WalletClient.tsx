"use client";

import { WalletPanel } from "@/components/wallet/WalletPanel";
import { withdrawPartnerWalletAction } from "./actions";
import type { WalletBalance, WalletTransaction } from "@/lib/walletClient";

export function WalletClient({
  partnerId,
  wallet,
  balance,
  transactions,
  withdrawalsEnabled,
}: {
  partnerId: string;
  wallet: { status: "ACTIVE" | "FROZEN" | "CLOSED"; withdrawable: boolean; frozenReason: string | null } | null;
  balance: WalletBalance;
  transactions: WalletTransaction[];
  withdrawalsEnabled: boolean;
}) {
  return (
    <WalletPanel
      wallet={wallet}
      balance={balance}
      transactions={transactions}
      withdrawalsEnabled={withdrawalsEnabled}
      onWithdraw={(amount) => withdrawPartnerWalletAction(partnerId, amount)}
    />
  );
}
