import { AppShell } from "@/components/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { referralCodeForPartner, referralLinkForPartner, listReferredPartners } from "@/lib/referrals";
import { formatDate } from "@/lib/format";

registerPage({
  id: "service-centre.referrals",
  moduleSlug: "service-centre",
  title: "Service Centre — Referrals",
  path: "/partner/[partnerId]/service-centre/referrals",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "This partner's own referral code/link, and a real list of Partners who signed up with it (Partner.referredByPartnerId). No rewards/credit ledger — that's real money movement, deliberately out of scope; this tracks who-referred-whom only.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/referrals/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ReferralsPage({ params }: { params: { partnerId: string } }) {
  const code = referralCodeForPartner(params.partnerId);
  const link = referralLinkForPartner(params.partnerId);
  const referred = await listReferredPartners(params.partnerId);

  return (
    <AppShell topbarTitle="Referrals">
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-bg-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Your referral code</div>
          <div className="mt-1 font-mono text-lg font-bold text-text">{code}</div>
          <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Share this link</div>
          <div className="mt-1 break-all rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-text">
            {link}
          </div>
          <p className="mt-3 text-sm text-text-muted">
            Anyone who signs up with your code shows up below. There's no automatic reward payout yet — that's a
            manual step for now.
          </p>
        </div>

        <div>
          <h2 className="font-display text-base font-bold text-text">
            Businesses you've referred {referred.length > 0 ? `(${referred.length})` : ""}
          </h2>
          {referred.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">No one has signed up with your code yet.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2">Business</th>
                    <th className="px-4 py-2">Partner ID</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {referred.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-text">{p.businessName}</td>
                      <td className="px-4 py-2 font-mono text-text-muted">{p.id}</td>
                      <td className="px-4 py-2">
                        <StatusChip
                          label={p.subscriptionStatus}
                          variant={p.subscriptionStatus === "Active" ? "success" : p.subscriptionStatus === "Trial" ? "teal" : "neutral"}
                        />
                      </td>
                      <td className="px-4 py-2 text-text-muted">{formatDate(p.createdAt.toISOString())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
