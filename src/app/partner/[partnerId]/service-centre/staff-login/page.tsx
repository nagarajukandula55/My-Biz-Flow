import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { signInAsStaff } from "./actions";

registerPage({
  id: "service-centre.staff-login",
  moduleSlug: "service-centre",
  title: "Service Centre — Staff Login",
  path: "/partner/[partnerId]/service-centre/staff-login",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Real login for a PartnerStaff account (technician/front-desk/manager) scoped to exactly this partner — verifies email+password against the PartnerStaff table and sets the mbf_staff_session cookie, distinct from the Partner owner's own session. Replaces the label-only 'Users' dropdown that previously had no real login (see src/lib/sample-data/users.ts's header comment).",
  sourceFile: "src/app/partner/[partnerId]/service-centre/staff-login/page.tsx",
});

export default function StaffLoginPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { error?: string };
}) {
  const action = signInAsStaff.bind(null, params.partnerId);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-8">
        <Link href={`/partner/${params.partnerId}/service-centre`} className="mb-6 flex items-center gap-2">
          <LogoMark size={24} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
        </Link>
        <h1 className="font-display text-xl font-bold text-text">Staff sign in</h1>
        <p className="mt-1 text-sm text-text-muted">Sign in with the email and password your Service Centre admin set up for you.</p>

        {searchParams.error === "invalid_credentials" && (
          <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            Email or password is incorrect, or your account is suspended.
          </p>
        )}

        <form action={action} className="mt-6 flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Email
            <input
              type="email"
              name="email"
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Password
            <input
              type="password"
              name="password"
              required
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
          <button type="submit" className="btn-accent mt-2 w-full">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
