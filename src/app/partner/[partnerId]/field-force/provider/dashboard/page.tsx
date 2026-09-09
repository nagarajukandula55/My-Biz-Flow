import { redirect } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { getCurrentProvider } from "@/lib/fieldForce/providerAuth";
import { listPendingOffersForProvider } from "@/lib/fieldForce/matchingEngine";
import { listTeamMembers } from "@/lib/fieldForce/providersData";
import { listServices } from "@/lib/fieldForce/servicesData";
import { listNotifications } from "@/lib/fieldForce/notifications";
import { respondToOfferAction, addTeamMemberAction } from "@/lib/fieldForce/actions";
import { getLocaleFromCookie } from "@/lib/i18n/cookie";
import { t, isRtl } from "@/lib/i18n/locales";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ProviderDashboardClient } from "./ProviderDashboardClient";

registerPage({
  id: "field-force.provider.dashboard",
  moduleSlug: "field-force",
  title: "Field Force — Provider Dashboard",
  path: "/partner/[partnerId]/field-force/provider/dashboard",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "A logged-in Provider's dashboard: pending JobOffers to accept/decline (respondToOffer in matchingEngine.ts), their team (onboarded under them via teamLeadId), and their notification feed. Session-scoped (mbf_ff_provider_session).",
  sourceFile: "src/app/partner/[partnerId]/field-force/provider/dashboard/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ProviderDashboardPage({ params }: { params: { partnerId: string } }) {
  const provider = await getCurrentProvider(params.partnerId);
  if (!provider) redirect(`/partner/${params.partnerId}/field-force/provider/login`);

  const [offers, teamMembers, services, notifications] = await Promise.all([
    listPendingOffersForProvider(provider.id, params.partnerId),
    listTeamMembers(provider.id),
    listServices(),
    listNotifications(params.partnerId, "provider", provider.id),
  ]);

  const locale = getLocaleFromCookie();

  return (
    <div dir={isRtl(locale) ? "rtl" : "ltr"} className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text">{t(locale, "dashboardTitleProvider")}</h1>
        <div className="flex items-center gap-3">
          <LanguageSwitcher current={locale} />
          <a href={`/partner/${params.partnerId}/field-force/provider/logout`} className="text-sm text-text-muted hover:underline">
            {t(locale, "navLogout")}
          </a>
        </div>
      </div>

      <ProviderDashboardClient
        offers={offers.map((o) => ({
          offerId: o.offerId,
          bookingNumber: o.bookingNumber,
          serviceName: o.serviceName,
          pincode: o.pincode,
          city: o.city,
          scheduledAt: o.scheduledAt.toISOString(),
          slotLabel: o.slotLabel,
          priceAmount: o.priceAmount,
        }))}
        teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name, phone: m.phone, skillLevel: m.skillLevel, status: m.status }))}
        services={services}
        notifications={notifications.map((n) => ({ id: n.id, title: n.title, body: n.body, createdAt: n.createdAt.toString(), isRead: n.isRead }))}
        locale={locale}
        respondAction={respondToOfferAction.bind(null, params.partnerId, provider.id)}
        addTeamMemberAction={addTeamMemberAction.bind(null, params.partnerId, provider.id)}
      />
    </div>
  );
}
