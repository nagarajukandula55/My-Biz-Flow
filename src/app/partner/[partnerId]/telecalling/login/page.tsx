import { registerPage } from "@/lib/designer/registry";
import { staffLoginAction } from "@/lib/telecalling/agentAuth";

registerPage({
  id: "telecalling.staff-login",
  moduleSlug: "telecalling",
  title: "Telecalling — Agent Login",
  path: "/partner/[partnerId]/telecalling/login",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Independent login for a Telecaller agent (PartnerStaff, role=Telecaller) — separate from the business owner's own /login. Verifies a generated Agent ID (loginId) + password, not email, and sets the staff session cookie (src/lib/partnerSession.ts). The ONLY page under /partner/[partnerId]/* reachable with no session at all (see PartnerLayout's STAFF_AUTH_ROUTE_SUFFIXES).",
  sourceFile: "src/app/partner/[partnerId]/telecalling/login/page.tsx",
});

export const dynamic = "force-dynamic";

export default function StaffLoginPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { error?: string };
}) {
  const action = staffLoginAction.bind(null, params.partnerId);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-6">
        <h1 className="font-display text-lg font-bold text-text">Telecalling Agent Login</h1>
        <p className="mt-1 text-sm text-text-muted">Sign in with the Agent ID and password your manager gave you.</p>

        {searchParams.error && (
          <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            Invalid Agent ID or password.
          </p>
        )}

        <form action={action} className="mt-4 space-y-3">
          <input
            name="agentId"
            required
            autoCapitalize="characters"
            placeholder="Agent ID (e.g. AGT001)"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          <button type="submit" className="btn-accent w-full">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
