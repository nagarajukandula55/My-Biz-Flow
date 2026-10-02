import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getPartnerStaff } from "@/lib/partnerStaff";
import { getStaffSession } from "@/lib/requirePartnerSession";
import { staffLogoutAction } from "@/lib/telecalling/agentAuth";
import { getWalletStatement } from "@/lib/walletClient";
import { env } from "@/lib/env";
import { WalletClient } from "./WalletClient";

registerPage({
  id: "telecalling.wallet",
  moduleSlug: "telecalling",
  title: "Telecalling — My Wallet",
  path: "/partner/[partnerId]/telecalling/wallet",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "A Telecaller agent's own ANy Pay wallet — the 10% referral commission earned when someone they referred (their loginId entered as the referral code at /signup) makes their first plan payment. Reached only via the agent's own login, same as the call queue. Real money, read live from AN-Accounting's wallet ledger.",
  sourceFile: "src/app/partner/[partnerId]/telecalling/wallet/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function AgentWalletPage({ params }: { params: { partnerId: string } }) {
  const session = await getStaffSession();
  if (!session || session.partnerId !== params.partnerId) {
    redirect(`/partner/${params.partnerId}/telecalling/login`);
  }

  const staff = await getPartnerStaff(params.partnerId, session.staffId);
  if (!staff) {
    redirect(`/partner/${params.partnerId}/telecalling/login`);
  }

  const { wallet, balance, transactions } = await getWalletStatement("TELECALLING_AGENT", session.staffId);
  const boundLogout = staffLogoutAction.bind(null, params.partnerId);

  return (
    <AppShell
      topbarTitle="Telecalling — My Wallet"
      topbarActions={
        <form action={boundLogout}>
          <button type="submit" className="text-sm font-semibold text-text-muted hover:text-text">
            Sign out ({staff?.name})
          </button>
        </form>
      }
    >
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">My Wallet</h1>
          <p className="mt-1 text-sm text-text-muted">
            Referral commission earned from your referral code, in real money. Request a withdrawal anytime.
          </p>
        </div>
        <div className="p-6">
          <WalletClient
            partnerId={params.partnerId}
            wallet={wallet}
            balance={balance}
            transactions={transactions}
            withdrawalsEnabled={env.walletWithdrawalEnabled()}
          />
        </div>
      </div>
    </AppShell>
  );
}
