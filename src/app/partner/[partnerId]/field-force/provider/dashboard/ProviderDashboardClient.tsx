"use client";

import { useState } from "react";
import { StatusChip } from "@/components/StatusChip";
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

type ActiveJobRow = {
  id: string;
  bookingNumber: string;
  serviceName: string;
  customerName: string;
  addressLine: string;
  status: string;
  slotLabel: string;
};

type TeamMemberRow = { id: string; name: string; phone: string; skillLevel: string; status: string };
type ServiceOption = { id: string; name: string; category: string };
type NotificationRow = { id: string; title: string; body: string; createdAt: string; isRead: boolean };

const STATUS_OPTIONS = ["en-route", "in-progress", "cancelled"] as const;

export function ProviderDashboardClient({
  offers,
  activeJobs,
  teamMembers,
  services,
  notifications,
  locale,
  respondAction,
  advanceStatusAction,
  addTeamMemberAction,
  closeBookingAction,
}: {
  offers: OfferRow[];
  activeJobs: ActiveJobRow[];
  teamMembers: TeamMemberRow[];
  services: ServiceOption[];
  notifications: NotificationRow[];
  locale: Locale;
  respondAction: (formData: FormData) => void;
  advanceStatusAction: (formData: FormData) => void;
  addTeamMemberAction: (formData: FormData) => void;
  closeBookingAction: (input: { bookingId: string; notes: string; photoDataUrl: string; latitude: number; longitude: number }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [closingJobId, setClosingJobId] = useState<string | null>(null);

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
                      {o.city} ({o.pincode}) · {o.slotLabel} · {new Date(o.scheduledAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
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
        <h2 className="font-display text-base font-bold text-text">{t(locale, "myJobsTitle")}</h2>
        {activeJobs.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">{t(locale, "noActiveJobs")}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {activeJobs.map((j) => (
              <div key={j.id} className="rounded-md border border-border bg-bg-raised p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-text">{j.serviceName}</div>
                    <div className="text-xs text-text-muted">
                      {j.customerName} · {j.addressLine} · {j.slotLabel}
                    </div>
                  </div>
                  <StatusChip
                    label={j.status}
                    variant={j.status === "completed" ? "success" : j.status === "cancelled" ? "danger" : "teal"}
                  />
                </div>
                {j.status !== "completed" && j.status !== "cancelled" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <form action={advanceStatusAction} className="flex items-center gap-2">
                      <input type="hidden" name="bookingId" value={j.id} />
                      <select name="status" defaultValue={j.status === "assigned" ? "en-route" : j.status} className="rounded-md border border-border bg-bg px-2 py-1.5 text-xs text-text">
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {t(locale, s === "en-route" ? "statusEnRoute" : s === "in-progress" ? "statusInProgress" : "statusCancelled")}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="btn-accent text-xs">
                        {t(locale, "updateStatus")}
                      </button>
                    </form>
                    <button type="button" onClick={() => setClosingJobId(j.id)} className="btn-accent text-xs">
                      Close Job
                    </button>
                  </div>
                )}
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

      {closingJobId && (
        <CloseJobModal
          bookingId={closingJobId}
          onClose={() => setClosingJobId(null)}
          closeBookingAction={closeBookingAction}
        />
      )}
    </div>
  );
}

/**
 * Real job-closure flow — not a bare status flip. Requires solution notes,
 * a photo taken right now (the file input's `capture="environment"`
 * attribute opens the device camera directly on mobile rather than a
 * gallery picker), and the device's own GPS location captured at submit
 * time via the Geolocation API (independent of the photo's EXIF, which
 * many phones strip). All three are required before "Close Job" can
 * submit — see closeBookingAsProvider's own validation as the real,
 * server-side backstop.
 */
function CloseJobModal({
  bookingId,
  onClose,
  closeBookingAction,
}: {
  bookingId: string;
  onClose: () => void;
  closeBookingAction: (input: { bookingId: string; notes: string; photoDataUrl: string; latitude: number; longitude: number }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [notes, setNotes] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  function capturePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  function captureLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Location isn't available on this device/browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocationError(err.message || "Couldn't get your location — check location permission.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  const canSubmit = notes.trim().length > 0 && Boolean(photoDataUrl) && Boolean(location) && !isSubmitting;

  function handleSubmit() {
    if (!photoDataUrl || !location) return;
    setSubmitError(null);
    setIsSubmitting(true);
    closeBookingAction({ bookingId, notes: notes.trim(), photoDataUrl, latitude: location.lat, longitude: location.lon }).then((result) => {
      setIsSubmitting(false);
      if (!result.ok) {
        setSubmitError(result.error ?? "Failed to close job.");
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-lg bg-bg p-4 sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-base font-bold text-text">Close Job</h3>
        <p className="mt-1 text-xs text-text-muted">Solution notes, a photo, and your current location are all required.</p>

        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Solution / what was done</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Replaced the compressor capacitor, tested cooling, customer confirmed working."
              className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Photo of completed work</label>
            {photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoDataUrl} alt="Job closure" className="h-32 w-full rounded-md border border-border object-cover" />
            ) : (
              <input type="file" accept="image/*" capture="environment" onChange={capturePhoto} className="w-full text-xs text-text" />
            )}
            {photoDataUrl && (
              <button type="button" onClick={() => setPhotoDataUrl(null)} className="mt-1 text-xs text-text-muted hover:underline">
                Retake
              </button>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Your location</label>
            {location ? (
              <p className="text-xs text-success">
                Captured: {location.lat.toFixed(5)}, {location.lon.toFixed(5)}
              </p>
            ) : (
              <button type="button" onClick={captureLocation} disabled={locating} className="btn-outline text-xs disabled:opacity-50">
                {locating ? "Getting location…" : "Capture my location"}
              </button>
            )}
            {locationError && <p className="mt-1 text-xs text-danger">{locationError}</p>}
          </div>

          {submitError && <p className="text-xs text-danger">{submitError}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1 text-xs">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="btn-accent flex-1 text-xs disabled:opacity-50">
              {isSubmitting ? "Closing…" : "Close Job"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
