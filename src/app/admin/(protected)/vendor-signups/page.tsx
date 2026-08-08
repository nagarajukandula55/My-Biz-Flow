import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listPendingSignupRequests } from "@/lib/vendorSignupRequestsData";
import { SignupRequestActions } from "./SignupRequestActions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.vendor-signups",
  moduleSlug: "platform",
  title: "Vendor Signup Requests",
  path: "/admin/vendor-signups",
  kind: "list",
  superAdminOnly: true,
  customizableRegions: [],
  explanation:
    "Review queue for signups against a Vendor Type with requiresApproval=true. Approving assigns the request a real VND#### id and creates the Vendor row; rejecting just marks it Rejected. Types without approval turned on skip this entirely and get a Vendor id immediately at signup.",
  sourceFile: "src/app/admin/(protected)/vendor-signups/page.tsx",
});

export default async function VendorSignupsPage() {
  const requests = await listPendingSignupRequests();

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Vendor Signup Requests</h1>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-muted">
            Pending signups against Vendor Types with approval required. Approving assigns a real Vendor ID.
          </p>
          <div className="mt-6">
            {requests.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No pending signup requests.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-bg-raised">
                <ul className="divide-y divide-border">
                  {requests.map((r) => (
                    <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text">{r.businessName}</div>
                        <div className="mt-0.5 text-xs text-text-muted">
                          {r.vendorTypeId} &middot; {r.city}, {r.state} &middot; {r.businessEmail} &middot;{" "}
                          {r.businessContact}
                        </div>
                      </div>
                      <SignupRequestActions requestId={r.id} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
