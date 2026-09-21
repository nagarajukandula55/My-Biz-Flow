import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { loginPosStaffAction } from "../actions";

registerPage({
  id: "pos.staff.login",
  moduleSlug: "pos",
  title: "POS — Staff Login",
  path: "/partner/[partnerId]/pos/staff/login",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "POS's own staff login — separate from the main partner session every other module uses, and with no customer-facing side at all (POS is staff-only, unlike Field Force's customer+provider split). Verifies a staff code (e.g. \"POS0001-01\") + password and sets the mbf_pos_staff_session cookie. Reachable without a partner login, same posture as Field Force's provider login.",
  sourceFile: "src/app/partner/[partnerId]/pos/staff/login/page.tsx",
});

export const dynamic = "force-dynamic";

export default function PosStaffLoginPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { error?: string };
}) {
  const action = loginPosStaffAction.bind(null, params.partnerId);

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="font-display text-xl font-bold text-text">POS Staff Login</h1>
      <p className="mt-1 text-sm text-text-muted">Sign in with your staff code (e.g. POS0001-01) to open the till.</p>

      {searchParams.error && <p className="mt-3 text-sm text-danger">Invalid staff code or password.</p>}

      <form action={action} className="mt-4 space-y-3">
        <input
          name="staffCode"
          placeholder="Staff Code (e.g. POS0001-01)"
          required
          autoCapitalize="characters"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm uppercase text-text"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
        <button type="submit" className="btn-accent w-full">
          Sign In
        </button>
      </form>

      <p className="mt-4 text-sm text-text-muted">
        New here?{" "}
        <Link href={`/partner/${params.partnerId}/pos/staff/signup`} className="text-accent hover:underline">
          Create a staff login
        </Link>
      </p>
    </div>
  );
}
