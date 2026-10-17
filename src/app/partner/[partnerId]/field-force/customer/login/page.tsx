import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { loginCustomerAction } from "@/lib/fieldForce/actions";
import { getLocaleFromCookie } from "@/lib/i18n/cookie";
import { t, isRtl } from "@/lib/i18n/locales";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { whatsappOtpLoginConfigured } from "@/lib/env";
import { LoginMethodTabs } from "./LoginMethodTabs";
import { WhatsAppOtpLoginForm } from "./WhatsAppOtpLoginForm";

registerPage({
  id: "field-force.customer.login",
  moduleSlug: "field-force",
  title: "Field Force — Customer Login",
  path: "/partner/[partnerId]/field-force/customer/login",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Public login page for a self-signed-up Customer — verifies phone+password, sets the mbf_ff_customer_session cookie. When WHATSAPP_OTP_TEMPLATE_NAME is configured, a second \"WhatsApp OTP\" tab is also offered (same cookie on success) — see whatsappOtpLoginConfigured() in src/lib/env.ts.",
  sourceFile: "src/app/partner/[partnerId]/field-force/customer/login/page.tsx",
});

export const dynamic = "force-dynamic";

export default function CustomerLoginPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { error?: string };
}) {
  const locale = getLocaleFromCookie();
  const action = loginCustomerAction.bind(null, params.partnerId);
  const showWhatsAppOtp = whatsappOtpLoginConfigured();

  const passwordForm = (
    <form action={action} className="space-y-3">
      <input name="phone" placeholder={t(locale, "phone")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
      <input name="password" type="password" placeholder={t(locale, "password")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
      <button type="submit" className="btn-accent w-full">
        {t(locale, "submit")}
      </button>
    </form>
  );

  return (
    <div dir={isRtl(locale) ? "rtl" : "ltr"} className="mx-auto max-w-md p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text">{t(locale, "loginTitle")}</h1>
        <LanguageSwitcher current={locale} />
      </div>

      {searchParams.error && <p className="mb-3 text-sm text-danger">{t(locale, "invalidCredentials")}</p>}

      {showWhatsAppOtp ? (
        <LoginMethodTabs passwordForm={passwordForm} otpForm={<WhatsAppOtpLoginForm partnerId={params.partnerId} />} />
      ) : (
        passwordForm
      )}

      <p className="mt-4 text-sm text-text-muted">
        {t(locale, "needAccount")}{" "}
        <Link href={`/partner/${params.partnerId}/field-force/customer/signup`} className="text-teal hover:underline">
          {t(locale, "signupInstead")}
        </Link>
      </p>
    </div>
  );
}
