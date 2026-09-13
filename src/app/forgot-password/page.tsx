import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

registerPage({
  id: "platform.forgot-password",
  moduleSlug: "platform",
  title: "Forgot Password",
  path: "/forgot-password",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public password-reset request page. Server Action (src/app/forgot-password/actions.ts) looks up the Partner, issues a short-lived signed reset token, and emails a /reset-password link via Resend (src/lib/email.ts). Always returns the same generic response so account existence is never leaked.",
  sourceFile: "src/app/forgot-password/page.tsx",
});

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-8">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <LogoMark size={24} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
        </Link>
        <h1 className="font-display text-xl font-bold text-text">Reset your password</h1>
        <p className="mt-1 text-sm text-text-muted">
          Enter the email on your account and we&apos;ll send a reset link.
        </p>

        <ForgotPasswordForm />

        <p className="mt-6 text-center text-sm text-text-muted">
          <Link href="/login" className="font-semibold text-teal hover:underline">
            &larr; Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
