"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n/locales";

type OfferRow = {
  offerId: string;
  bookingNumber: string;
  serviceName: string;
  pincode: string;
  city: string;
  scheduledAt: string;
  slotLabel: string;
  priceAmount: number;
};

type TeamMemberRow = { id: string; name: string; phone: string; skillLevel: string; status: string };
type ServiceOption = { id: string; name: string; category: string };
type NotificationRow = { id: string; title: string; body: string; createdAt: string; isRead: boolean };

export function ProviderDashboardClient({
  offers,
  teamMembers,
  services,
  notifications,
  locale,
  respondAction,
  addTeamMemberAction,
}: {
  offers: OfferRow[];
  teamMembers: TeamMemberRow[];
  services: ServiceOption[];
  notifications: NotificationRow[];
  locale: Locale;
  respondAction: (formData: FormData) => void;
  addTeamMemberAction: (formData: FormData) => void;
}) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddMember(formData: FormData) {
    formData.set("serviceIds", "");
    selectedServiceIds.forEach((id) => formData.append("serviceIds", id));
    addTeamMemberAction(formData);
    setShowAddMember(false);
    setSelectedServiceIds(new Set());
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-base font-bold text-text">{t(locale, "pendingOffersTitle")}</h2>
        {offers.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">{t(locale, "noPendingOffers")}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {offers.map((o) => (
              <div key={o.offerId} className="rounded-md border border-border bg-bg-raised p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-text">{o.serviceName}</div>
                    <div className="text-xs text-text-muted">
                      {o.city} ({o.pincode}) · {o.slotLabel} · {new Date(o.scheduledAt).toLocaleDateString()}
                    </div>
                    <div className="mt-1 font-mono text-xs tabular-nums text-text-muted">
                      {t(locale, "standardRate")}: ₹{(o.priceAmount / 100).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={respondAction}>
                      <input type="hidden" name="offerId" value={o.offerId} />
                      <input type="hidden" name="response" value="accepted" />
                      <button type="submit" className="btn-accent text-xs">
                        {t(locale, "acceptOffer")}
                      </button>
                    </form>
                    <form action={respondAction}>
                      <input type="hidden" name="offerId" value={o.offerId} />
                      <input type="hidden" name="response" value="declined" />
                      <button type="submit" className="btn-outline text-xs">
                        {t(locale, "declineOffer")}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-text">{t(locale, "teamMembersTitle")}</h2>
          <button type="button" onClick={() => setShowAddMember((v) => !v)} className="btn-outline text-xs">
            {t(locale, "addTeamMember")}
          </button>
        </div>

        {teamMembers.length > 0 && (
          <div className="mt-3 space-y-2">
            {teamMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text">
                <span>
                  {m.name} <span className="text-text-muted">({m.phone} · {m.skillLevel})</span>
                </span>
                <span className="text-xs text-text-muted">{m.status}</span>
              </div>
            ))}
          </div>
        )}

        {showAddMember && (
          <form action={handleAddMember} className="mt-3 space-y-3 rounded-md border border-dashed border-border bg-bg-raised p-3">
            <input name="name" placeholder={t(locale, "name")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
            <input name="phone" placeholder={t(locale, "phone")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
            <input name="pincode" placeholder={t(locale, "pincode")} required pattern="\d{6}" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
            <select name="skillLevel" defaultValue="skilled" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
              <option value="skilled">{t(locale, "skilled")}</option>
              <option value="unskilled">{t(locale, "unskilled")}</option>
            </select>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
                  <input type="checkbox" checked={selectedServiceIds.has(s.id)} onChange={() => toggleService(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
            <button type="submit" className="btn-accent text-xs">
              {t(locale, "submit")}
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="font-display text-base font-bold text-text">{t(locale, "notificationsTitle")}</h2>
        {notifications.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">{t(locale, "noNotifications")}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className={`rounded-md border border-border p-3 text-sm ${n.isRead ? "bg-bg" : "bg-bg-raised"}`}>
                <div className="font-semibold text-text">{n.title}</div>
                <div className="text-text-muted">{n.body}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
