import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { verifyPasswordResetToken } from "@/lib/partnerSession";
import { resetPasswordAction } from "./actions";

registerPage({
  id: "platform.reset-password",
  moduleSlug: "platform",
  title: "Reset Password",
  path: "/reset-password",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public password-reset landing page reached via the emailed reset link (?token=...). Verifies the signed, single-purpose token server-side (src/lib/partnerSession.ts's verifyPasswordResetToken) before showing the new-password form; resetPasswordAction (src/app/reset-password/actions.ts) re-verifies on submit and updates Partner.passwordHash.",
  sourceFile: "src/app/reset-password/page.tsx",
});

const ERROR_MESSAGE: Record<string, string> = {
  too_short: "Password must be at least 8 characters.",
  mismatch: "Passwords don't match.",
  invalid_token: "This reset link is invalid or has expired.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  const token = searchParams.token ?? "";
  const partnerId = await verifyPasswordResetToken(token);
  const tokenValid = !!partnerId && searchParams.error !== "invalid_token";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-8">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <LogoMark size={24} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
        </Link>
        <h1 className="font-display text-xl font-bold text-text">Set a new password</h1>

        {!tokenValid ? (
          <>
            <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
              {ERROR_MESSAGE.invalid_token}
            </p>
            <p className="mt-6 text-center text-sm text-text-muted">
              <Link href="/forgot-password" className="font-semibold text-teal hover:underline">
                &larr; Request a new reset link
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-text-muted">Choose a new password for your account.</p>

            {searchParams.error && (
              <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
                {ERROR_MESSAGE[searchParams.error] ?? "Something went wrong."}
              </p>
            )}

            <form action={resetPasswordAction} className="mt-6 flex flex-col gap-3">
              <input type="hidden" name="token" value={token} />
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

            <p className="mt-6 text-center text-sm text-text-muted">
              <Link href="/login" className="font-semibold text-teal hover:underline">
                &larr; Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
