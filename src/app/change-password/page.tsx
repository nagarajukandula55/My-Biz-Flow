import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { VENDOR_SESSION_COOKIE } from "@/lib/vendorSession";
import { changePasswordAction } from "./actions";

registerPage({
  id: "platform.change-password",
  moduleSlug: "platform",
  title: "Change Password",
  path: "/change-password",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Forced first-login password change — every Vendor account is created with mustChangePassword=true (signup never collects a password directly, one is generated and shown once). Requires an active vendor session cookie; setVendorPassword() clears the flag.",
  sourceFile: "src/app/change-password/page.tsx",
});

const ERROR_MESSAGE: Record<string, string> = {
  too_short: "Password must be at least 8 characters.",
  mismatch: "Passwords don't match.",
};

export default function ChangePasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  const vendorId = cookies().get(VENDOR_SESSION_COOKIE)?.value;
  if (!vendorId) redirect("/login");

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-8">
        <div className="mb-6 flex items-center gap-2">
          <LogoMark size={24} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
        </div>
        <h1 className="font-display text-xl font-bold text-text">Set your password</h1>
        <p className="mt-1 text-sm text-text-muted">
          You&apos;re signed in with a one-time password. Set your own before continuing.
        </p>

        {searchParams.error && (
          <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {ERROR_MESSAGE[searchParams.error] ?? "Something went wrong."}
          </p>
        )}

        <form action={changePasswordAction} className="mt-6 flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            New Password
            <input
              type="password"
              name="newPassword"
              required
              minLength={8}
              autoFocus
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Confirm Password
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
          <button type="submit" className="btn-accent mt-2 w-full">
            Set password
          </button>
        </form>
      </div>
    </div>
  );
}
