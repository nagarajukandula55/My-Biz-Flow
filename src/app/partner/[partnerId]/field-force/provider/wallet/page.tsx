import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getCurrentProvider } from "@/lib/fieldForce/providerAuth";
import { getWalletStatement } from "@/lib/walletClient";
import { env } from "@/lib/env";
import { WalletClient } from "./WalletClient";

registerPage({
  id: "field-force.provider.wallet",
  moduleSlug: "field-force",
  title: "Field Force — My Wallet",
  path: "/partner/[partnerId]/field-force/provider/wallet",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "An engineer's own wallet — scaffolding for job-payout settlement, reusing the same generic wallet system Telecalling's agent wallet already uses (getWalletStatement/WalletPanel, keyed by ownerType \"FIELD_FORCE_PROVIDER\"). Per explicit product decision, nothing credits this automatically yet — completed-job payouts (Booking.providerPayout, src/lib/fieldForce/commission.ts) are settled manually outside the app for now; src/lib/walletClient.ts's creditProviderPayout() exists ready to wire in once automatic settlement is wanted. Reached only via the engineer's own login.",
  sourceFile: "src/app/partner/[partnerId]/field-force/provider/wallet/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ProviderWalletPage({ params }: { params: { partnerId: string } }) {
  const provider = await getCurrentProvider(params.partnerId);
  if (!provider) {
    redirect(`/partner/${params.partnerId}/field-force/provider/login`);
  }

  const { wallet, balance, transactions } = await getWalletStatement("FIELD_FORCE_PROVIDER", provider.id);

  return (
    <AppShell
      topbarTitle="Field Force — My Wallet"
      topbarActions={
        <a href={`/partner/${params.partnerId}/field-force/provider/logout`} className="text-sm font-semibold text-text-muted hover:text-text">
          Sign out ({provider.name})
        </a>
      }
    >
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">My Wallet</h1>
          <p className="mt-1 text-sm text-text-muted">
            Job payout balance. For now, completed jobs are settled with you directly — this will show live credits
            here once automatic settlement is turned on.
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
