import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { getFieldForceSettings } from "@/lib/fieldForce/settingsData";
import { listServices } from "@/lib/fieldForce/servicesData";
import { signupProviderAction } from "@/lib/fieldForce/actions";
import { getLocaleFromCookie } from "@/lib/i18n/cookie";
import { t, isRtl } from "@/lib/i18n/locales";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ProviderSignupForm } from "./ProviderSignupForm";

registerPage({
  id: "field-force.provider.signup",
  moduleSlug: "field-force",
  title: "Field Force — Provider Sign Up",
  path: "/partner/[partnerId]/field-force/provider/signup",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public self-signup page for a Provider (skilled or unskilled worker), gated on FieldForceSettings.providerSignupEnabled. Pincode is mandatory. Supports the local-language switcher. Real data — Prisma-backed (Provider table).",
  sourceFile: "src/app/partner/[partnerId]/field-force/provider/signup/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ProviderSignupPage({ params }: { params: { partnerId: string } }) {
  const [settings, services] = await Promise.all([
    getFieldForceSettings(params.partnerId),
    listServices(),
  ]);
  const locale = getLocaleFromCookie();
  const action = signupProviderAction.bind(null, params.partnerId);

  return (
    <div dir={isRtl(locale) ? "rtl" : "ltr"} className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text">{t(locale, "signupTitleProvider")}</h1>
        <LanguageSwitcher current={locale} />
      </div>

      {!settings.providerSignupEnabled ? (
        <p className="rounded-md border border-dashed border-border bg-bg-raised p-4 text-sm text-text-muted">
          {t(locale, "signupClosed")}
        </p>
      ) : (
        <ProviderSignupForm services={services} action={action} locale={locale} />
      )}

      <p className="mt-4 text-sm text-text-muted">
        {t(locale, "alreadySignedUp")}{" "}
        <Link href={`/partner/${params.partnerId}/field-force/provider/login`} className="text-teal hover:underline">
          {t(locale, "loginInstead")}
        </Link>
      </p>
    </div>
  );
}
