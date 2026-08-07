import { LogoMark } from "@/components/LogoMark";
import { signInAsAdmin } from "./actions";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = searchParams.next ?? "/admin/designer";
  const hasError = searchParams.error === "1";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-8">
        <div className="mb-6 flex items-center gap-2">
          <LogoMark size={24} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
        </div>
        <h1 className="font-display text-xl font-bold text-text">Super Admin sign-in</h1>
        <p className="mt-1 text-sm text-text-muted">
          Shared secret gate — a stopgap, not real per-user auth. See{" "}
          <code className="font-mono text-xs">src/lib/adminAuth.ts</code>.
        </p>

        {hasError && (
          <div className="mt-4 rounded-md border border-danger-soft bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            Incorrect password.
          </div>
        )}

        <form action={signInAsAdmin} className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Password
            <input
              type="password"
              name="password"
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
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
