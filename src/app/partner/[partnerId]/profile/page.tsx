import { AppShell } from "@/components/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { getPartner } from "@/lib/partnerData";
import { getVisibleModules } from "@/lib/designer/entitlements";
import { MODULES } from "@/lib/designer/modules";

registerPage({
  id: "platform.profile",
  moduleSlug: "platform",
  title: "Profile",
  path: "/partner/[partnerId]/profile",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "The partner's own account page — login id, business identity, and which of the platform's modules they currently have access to vs. what exists in the catalog. Entitlement-driven throughout (getVisibleModules, src/lib/designer/entitlements.ts): a module only shows as 'Active' here once both enabled for the partner's type AND an active access key has been issued.",
  sourceFile: "src/app/partner/[partnerId]/profile/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: { partnerId: string } }) {
  const partner = await getPartner(params.partnerId);
  const visibleModules = await getVisibleModules(params.partnerId);
  const visibleSlugs = new Set(visibleModules.map((m) => m.slug));

  return (
    <AppShell topbarTitle="Profile">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Profile</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Your account and what you currently have access to.
        </p>

        <div className="mt-6 max-w-2xl rounded-md border border-border bg-bg-raised p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Partner ID</div>
              <div className="mt-0.5 text-sm text-text">{partner?.id ?? params.partnerId}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Business Name</div>
              <div className="mt-0.5 text-sm text-text">{partner?.businessName ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Login Contact</div>
              <div className="mt-0.5 text-sm text-text">{partner?.loginContact ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</div>
              <div className="mt-0.5">
                <StatusChip label={partner?.status ?? "Unknown"} variant={partner?.status === "Active" ? "success" : "neutral"} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-text">Your access</h2>
          <p className="mt-1 text-sm text-text-muted">
            {visibleModules.length} of {MODULES.length} modules active on your account. The rest are either
            not part of your plan or don&apos;t have an access key issued yet — contact support to add one.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <div
                key={m.slug}
                className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-3 py-2.5"
              >
                <div className="text-sm font-semibold text-text">{m.label}</div>
                <StatusChip
                  label={visibleSlugs.has(m.slug) ? "Active" : "Not available"}
                  variant={visibleSlugs.has(m.slug) ? "success" : "neutral"}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
