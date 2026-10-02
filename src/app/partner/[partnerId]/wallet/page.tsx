import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getWalletStatement } from "@/lib/walletClient";
import { env } from "@/lib/env";
import { WalletClient } from "./WalletClient";

registerPage({
  id: "platform.wallet",
  moduleSlug: "platform",
  title: "Wallet",
  path: "/partner/[partnerId]/wallet",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "The partner's own ANy Pay wallet — real money, not promo credit. Shows referral commission (10% on a referred partner's first payment) and any manual adjustments, with a withdrawal request form. Balance/statement are read live from AN-Accounting's wallet ledger (src/lib/walletClient.ts); this app never stores the balance itself.",
  sourceFile: "src/app/partner/[partnerId]/wallet/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function WalletPage({ params }: { params: { partnerId: string } }) {
  const { wallet, balance, transactions } = await getWalletStatement("PARTNER", params.partnerId);

  return (
    <AppShell topbarTitle="Wallet">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Wallet</h1>
          <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
            Real money credited to you — referral commissions and any manual adjustments. Request a withdrawal
            anytime; it's reviewed and paid out via bank transfer.
          </p>
        </div>
        <WalletClient
          partnerId={params.partnerId}
          wallet={wallet}
          balance={balance}
          transactions={transactions}
          withdrawalsEnabled={env.walletWithdrawalEnabled()}
        />
      </div>
    </AppShell>
  );
}
