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
    <div className="flex min-h-screen w-full bg-bg">
      {/* Left: brand/context panel, real product mechanics instead of
          decoration -- dropped on small screens where there's no room. */}
      <div className="hidden w-[38%] flex-col justify-between bg-sidebar-bg px-10 py-10 text-sidebar-text lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo height={28} />
        </Link>
        <div>
          <p className="font-display text-2xl font-bold text-white">One platform.</p>
          <p className="mt-1 font-display text-2xl font-bold text-white">Every business you run.</p>
          <ul className="mt-6 space-y-2.5 text-sm text-sidebar-text-dim">
            {["POS", "Service Centre workorders", "Billing & GST invoicing", "Inventory", "HRMS", "Clinic"].map((m) => (
              <li key={m} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-teal" />
                {m}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-sidebar-text-dim">&copy; {new Date().getFullYear()} My Biz Flow</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-8">
        <Link href="/" className="mb-6 flex items-center gap-2 lg:hidden">
          <BrandLogo height={32} />
        </Link>
        <h1 className="font-display text-xl font-bold text-text">Sign in</h1>

        {searchParams.error === "invalid_credentials" && (
          <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            Partner ID / contact number or password is incorrect.
          </p>
        )}

        {searchParams.error === "server_misconfigured" && (
          <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            Sign-in is temporarily unavailable due to a server configuration issue. Please try again shortly, or
            contact support if this persists.
          </p>
        )}

        {searchParams.reset === "success" && (
          <p className="mt-3 rounded-md border border-success-soft bg-success-soft px-3 py-2 text-sm font-semibold text-success">
            Your password has been reset. Sign in with your new password.
          </p>
        )}

        <p className="mt-2 text-sm text-text-muted">Sign in with your Partner ID or registered contact number.</p>

        <form action={signInAsPartner} className="mt-6 flex flex-col gap-3">
          <label className="text-sm font-medium text-text">
            <span className="flex items-center gap-2">
              Partner ID or Contact Number
              <span className="rounded bg-bg-sunken px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                VND#### / 98xxxxxxxx
              </span>
            </span>
            <input
              type="text"
              name="identifier"
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
          <label className="text-sm font-medium text-text">
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
        <p className="mt-2 text-center text-sm text-text-muted">
          <Link href="/track" className="font-semibold text-teal hover:underline">
            Track a repair without an account
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
