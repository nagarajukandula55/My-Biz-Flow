import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.signup.success",
  moduleSlug: "platform",
  title: "Signup — Success",
  path: "/signup/success",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Informative post-signup landing page — shows the assigned Vendor ID and one-time password once (not stored/retrievable again), with clear next steps. Reached only via redirect from the signup Server Action, never linked to directly.",
  sourceFile: "src/app/signup/success/page.tsx",
});

export default function SignupSuccessPage({
  searchParams,
}: {
  searchParams: { vendorId?: string; password?: string };
}) {
  const { vendorId, password } = searchParams;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-lg rounded-lg border border-border bg-bg-raised p-8 text-center">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <LogoMark size={24} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
        </Link>

        <h1 className="font-display text-2xl font-bold text-text">Account created</h1>
        <p className="mt-2 text-sm text-text-muted">
          Save these details now — this password is shown only once. Once email is configured we&apos;ll also
          send it to your business email; for now, note it down.
        </p>

        <div className="mt-6 space-y-3 rounded-md border border-border bg-bg p-5 text-left">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Vendor ID</div>
            <div className="mt-0.5 font-mono text-lg font-bold text-text">{vendorId ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">One-Time Password</div>
            <div className="mt-0.5 font-mono text-lg font-bold text-text">{password ?? "—"}</div>
          </div>
        </div>

        <p className="mt-4 text-xs text-text-muted">
          You&apos;ll be asked to set your own password the first time you sign in.
        </p>

        <Link href="/login" className="btn-accent mt-6 inline-block w-full">
          Continue to Sign In
        </Link>
      </div>
    </div>
  );
}
