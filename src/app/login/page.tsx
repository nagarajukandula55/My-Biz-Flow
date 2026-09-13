import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { registerPage } from "@/lib/designer/registry";
import { signInAsPartner } from "./actions";

registerPage({
  id: "platform.login",
  moduleSlug: "platform",
  title: "Login",
  path: "/login",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public, non-partner-scoped login page (no AppShell/sidebar — lightweight public page shell). Real partner lookup by Partner ID (VND####) or registered contact number, real password verification against the Partner table (see src/app/login/actions.ts) — route-level session enforcement on /partner/[partnerId]/* pages doesn't exist yet.",
  sourceFile: "src/app/login/page.tsx",
});

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; reset?: string };
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-8">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <BrandLogo height={32} />
        </Link>
        <h1 className="font-display text-xl font-bold text-text">Sign in</h1>

        {searchParams.error === "invalid_credentials" && (
          <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            Partner ID / contact number or password is incorrect.
          </p>
        )}

        {searchParams.reset === "success" && (
          <p className="mt-3 rounded-md border border-success-soft bg-success-soft px-3 py-2 text-sm font-semibold text-success">
            Your password has been reset. Sign in with your new password.
          </p>
        )}

        <p className="mt-2 text-sm text-text-muted">Sign in with your Partner ID or registered contact number.</p>

        <form action={signInAsPartner} className="mt-6 flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Partner ID or Contact Number
            <input
              type="text"
              name="identifier"
              placeholder="VND0001 or 98xxxxxxxx"
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
          <div className="text-right">
            <Link href="/forgot-password" className="text-xs font-semibold text-teal hover:underline">
              Forgot password?
            </Link>
          </div>
          <button type="submit" className="btn-accent mt-2 w-full">
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-teal hover:underline">
            Register your business
          </Link>
        </p>
      </div>
    </div>
  );
}
