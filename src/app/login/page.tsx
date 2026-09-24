import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { registerPage } from "@/lib/designer/registry";
import { signInAsPartner } from "./actions";
import { env, googleOAuthConfigured, telegramLoginConfigured } from "@/lib/env";
import { TelegramLoginWidget } from "./TelegramLoginWidget";

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

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_no_account:
    "No account found for that Google email — log in with your phone/id and password, or contact support to link your account.",
  google_auth_failed: "Google sign-in failed. Please try again.",
  google_invalid_state: "Google sign-in session expired. Please try again.",
  google_not_configured: "Google sign-in isn't available right now.",
};

const TELEGRAM_ERROR_MESSAGES: Record<string, string> = {
  telegram_not_connected:
    "This Telegram account isn't connected to any business yet — log in with your phone/id and password first, then connect Telegram from your settings page.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; reset?: string };
}) {
  const showGoogle = googleOAuthConfigured();
  const showTelegram = telegramLoginConfigured();
  const telegramBotUsername = env.telegramLoginBotUsername();
  const googleError = searchParams.error ? GOOGLE_ERROR_MESSAGES[searchParams.error] : undefined;
  const telegramError = searchParams.error ? TELEGRAM_ERROR_MESSAGES[searchParams.error] : undefined;

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

        {googleError && (
          <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {googleError}
          </p>
        )}

        {telegramError && (
          <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {telegramError}
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

        {(showGoogle || (showTelegram && telegramBotUsername)) && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">or continue with</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {showGoogle && (
              <Link
                href="/api/auth/google"
                className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-semibold text-text hover:bg-bg-sunken"
              >
                <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.6-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.3 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.9 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-3.5z" />
                </svg>
                Sign in with Google
              </Link>
            )}

            {showTelegram && telegramBotUsername && (
              <div className="flex w-full justify-center">
                <TelegramLoginWidget botUsername={telegramBotUsername} />
              </div>
            )}
          </div>
        )}

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
