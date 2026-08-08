import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { signInAsVendor } from "./actions";

registerPage({
  id: "platform.login",
  moduleSlug: "platform",
  title: "Login",
  path: "/login",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public, non-vendor-scoped login page (no AppShell/sidebar — lightweight public page shell). Demo Server Action sets a lightweight mbf_vendor_session cookie (src/lib/vendorSession.ts) and redirects to a hardcoded demo vendor route (/vendor/demo/pos) — there is no real password check or vendor lookup yet, see src/app/login/actions.ts.",
  sourceFile: "src/app/login/page.tsx",
});

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-8">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <LogoMark size={24} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
        </Link>
        <h1 className="font-display text-xl font-bold text-text">Sign in</h1>
        <p className="mt-1 text-sm text-text-muted">
          Demo login — no real backend yet. Any email/password combination signs you into a hardcoded demo vendor
          account. See <code className="font-mono text-xs">src/app/login/actions.ts</code>.
        </p>

        <form action={signInAsVendor} className="mt-6 flex flex-col gap-3">
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
