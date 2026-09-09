import { redirect } from "next/navigation";
import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { getCurrentCustomer } from "@/lib/fieldForce/customerAuth";
import { listServices } from "@/lib/fieldForce/servicesData";
import { createCustomerBookingAction } from "@/lib/fieldForce/actions";
import { getLocaleFromCookie } from "@/lib/i18n/cookie";
import { t, isRtl } from "@/lib/i18n/locales";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CustomerBookForm } from "./CustomerBookForm";

registerPage({
  id: "field-force.customer.book",
  moduleSlug: "field-force",
  title: "Field Force — Customer Booking",
  path: "/partner/[partnerId]/field-force/customer/book",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "A logged-in Customer's self-service booking creation — identity comes from the session (mbf_ff_customer_session), not a typed-in name/phone. Triggers automated dispatch (matchingEngine.dispatchBookingRequest) on submit.",
  sourceFile: "src/app/partner/[partnerId]/field-force/customer/book/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function CustomerBookPage({ params }: { params: { partnerId: string } }) {
  const customer = await getCurrentCustomer(params.partnerId);
  if (!customer) redirect(`/partner/${params.partnerId}/field-force/customer/login`);

  const services = await listServices();
  const locale = getLocaleFromCookie();
  const action = createCustomerBookingAction.bind(null, params.partnerId, customer.id);

  return (
    <div dir={isRtl(locale) ? "rtl" : "ltr"} className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text">{t(locale, "bookServiceTitle")}</h1>
        <div className="flex items-center gap-3">
          <LanguageSwitcher current={locale} />
          <Link href={`/partner/${params.partnerId}/field-force/customer/bookings`} className="text-sm text-teal hover:underline">
            {t(locale, "navBookings")}
          </Link>
        </div>
      </div>
      <CustomerBookForm services={services} action={action} locale={locale} />
    </div>
  );
}
