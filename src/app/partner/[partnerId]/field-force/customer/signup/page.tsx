import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { getFieldForceSettings } from "@/lib/fieldForce/settingsData";
import { signupCustomerAction } from "@/lib/fieldForce/actions";
import { getLocaleFromCookie } from "@/lib/i18n/cookie";
import { t, isRtl } from "@/lib/i18n/locales";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

registerPage({
  id: "field-force.customer.signup",
  moduleSlug: "field-force",
  title: "Field Force — Customer Sign Up",
  path: "/partner/[partnerId]/field-force/customer/signup",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public self-signup page for a Customer, gated on FieldForceSettings.customerSignupEnabled (a Super Admin toggle on field-force/admin). Supports the local-language switcher — see src/lib/i18n/. Real data — Prisma-backed (Customer table).",
  sourceFile: "src/app/partner/[partnerId]/field-force/customer/signup/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function CustomerSignupPage({ params }: { params: { partnerId: string } }) {
  const settings = await getFieldForceSettings(params.partnerId);
  const locale = getLocaleFromCookie();
  const action = signupCustomerAction.bind(null, params.partnerId);

  return (
    <div dir={isRtl(locale) ? "rtl" : "ltr"} className="mx-auto max-w-md p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text">{t(locale, "signupTitleCustomer")}</h1>
        <LanguageSwitcher current={locale} />
      </div>

      {!settings.customerSignupEnabled ? (
        <p className="rounded-md border border-dashed border-border bg-bg-raised p-4 text-sm text-text-muted">
          {t(locale, "signupClosed")}
        </p>
      ) : (
        <form action={action} className="space-y-3">
          <input name="name" placeholder={t(locale, "name")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <input name="phone" placeholder={t(locale, "phone")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <input name="email" type="email" placeholder={t(locale, "email")} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <input name="password" type="password" placeholder={t(locale, "password")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <button type="submit" className="btn-accent w-full">
            {t(locale, "submit")}
          </button>
        </form>
      )}

      <p className="mt-4 text-sm text-text-muted">
        {t(locale, "alreadySignedUp")}{" "}
        <Link href={`/partner/${params.partnerId}/field-force/customer/login`} className="text-teal hover:underline">
          {t(locale, "loginInstead")}
        </Link>
      </p>
    </div>
  );
}
