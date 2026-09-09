"use client";

import { useMemo, useState } from "react";
import { INDIAN_STATES } from "@/lib/sample-data/geo";
import { t, type Locale } from "@/lib/i18n/locales";

type ServiceOption = {
  id: string;
  name: string;
  category: string;
  priceType: string;
  basePrice: number;
  durationMinutes: number;
};

const SLOTS = ["Morning (9 AM – 12 PM)", "Afternoon (12 PM – 4 PM)", "Evening (4 PM – 8 PM)"];

export function CustomerBookForm({
  services,
  action,
  locale,
}: {
  services: ServiceOption[];
  action: (formData: FormData) => void;
  locale: Locale;
}) {
  const [serviceId, setServiceId] = useState("");
  const [state, setState] = useState<string>(INDIAN_STATES[0]);
  const categories = Array.from(new Set(services.map((s) => s.category)));
  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);

  return (
    <form action={action} className="space-y-6">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">{t(locale, "selectAddressLine1")} *</label>
        <input name="line1" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input name="city" placeholder={t(locale, "city")} required className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <select name="state" value={state} onChange={(e) => setState(e.target.value)} required className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input name="pincode" placeholder={t(locale, "pincode")} required pattern="\d{6}" className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{t(locale, "selectService")}</div>
        {categories.map((cat) => (
          <div key={cat} className="mb-3">
            <div className="mb-1.5 text-xs font-semibold text-text-muted">{cat}</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {services
                .filter((s) => s.category === cat)
                .map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm text-text ${
                      serviceId === s.id ? "border-accent bg-bg-raised" : "border-border bg-bg-raised"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input type="radio" name="serviceId" value={s.id} checked={serviceId === s.id} onChange={() => setServiceId(s.id)} required />
                      {s.name}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-text-muted">
                      ₹{(s.basePrice / 100).toLocaleString("en-IN")}
                      {s.priceType === "hourly" ? "/hr" : ""}
                    </span>
                  </label>
                ))}
            </div>
          </div>
        ))}
        {selectedService && (
          <p className="text-sm text-text-muted">{t(locale, "standardRate")}: ₹{(selectedService.basePrice / 100).toLocaleString("en-IN")}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">{t(locale, "scheduleDate")} *</label>
          <input name="scheduledDate" type="date" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">{t(locale, "scheduleSlot")} *</label>
          <select name="slotLabel" required defaultValue="" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
            <option value="" disabled>
              {t(locale, "scheduleSlot")}
            </option>
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <textarea name="notes" rows={3} placeholder={t(locale, "notes")} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />

      <button type="submit" className="btn-accent w-full">
        {t(locale, "createBookingButton")}
      </button>
    </form>
  );
}
