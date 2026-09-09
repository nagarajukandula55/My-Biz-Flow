import { redirect } from "next/navigation";
import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { getCurrentCustomer } from "@/lib/fieldForce/customerAuth";
import { listBookingsForCustomer } from "@/lib/fieldForce/bookingsData";
import { getLocaleFromCookie } from "@/lib/i18n/cookie";
import { t, isRtl } from "@/lib/i18n/locales";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { StatusChip } from "@/components/StatusChip";

registerPage({
  id: "field-force.customer.bookings",
  moduleSlug: "field-force",
  title: "Field Force — Customer Bookings",
  path: "/partner/[partnerId]/field-force/customer/bookings",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "A logged-in Customer's own bookings, session-scoped (mbf_ff_customer_session) — never another customer's data.",
  sourceFile: "src/app/partner/[partnerId]/field-force/customer/bookings/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function CustomerBookingsPage({ params }: { params: { partnerId: string } }) {
  const customer = await getCurrentCustomer(params.partnerId);
  if (!customer) redirect(`/partner/${params.partnerId}/field-force/customer/login`);

  const bookings = await listBookingsForCustomer(customer.id, params.partnerId);
  const locale = getLocaleFromCookie();

  return (
    <div dir={isRtl(locale) ? "rtl" : "ltr"} className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text">{t(locale, "myBookingsTitle")}</h1>
        <div className="flex items-center gap-3">
          <LanguageSwitcher current={locale} />
          <Link href={`/partner/${params.partnerId}/field-force/customer/book`} className="btn-accent text-xs">
            +
          </Link>
          <a href={`/partner/${params.partnerId}/field-force/customer/logout`} className="text-sm text-text-muted hover:underline">
            {t(locale, "navLogout")}
          </a>
        </div>
      </div>

      {bookings.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
          {t(locale, "noBookingsYet")}
        </p>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/partner/${params.partnerId}/field-force/customer/bookings/${b.id}`}
              className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-3 py-2.5"
            >
              <div>
                <div className="text-sm font-semibold text-text">{b.serviceName}</div>
                <div className="text-xs text-text-muted">{b.bookingNumber} · {b.slotLabel}</div>
              </div>
              <StatusChip label={b.status} variant={b.status === "completed" ? "success" : b.status === "cancelled" ? "danger" : "teal"} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
