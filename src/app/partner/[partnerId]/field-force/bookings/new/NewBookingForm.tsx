"use client";

import { useMemo, useState } from "react";
import { INDIAN_STATES } from "@/lib/sample-data/geo";

type ServiceOption = {
  id: string;
  name: string;
  category: string;
  priceType: string;
  basePrice: number;
  durationMinutes: number;
  minSkillLevel: string;
};

const SLOTS = ["Morning (9 AM – 12 PM)", "Afternoon (12 PM – 4 PM)", "Evening (4 PM – 8 PM)"];

export function NewBookingForm({ services, action }: { services: ServiceOption[]; action: (formData: FormData) => void }) {
  const [serviceId, setServiceId] = useState("");
  const [state, setState] = useState<string>(INDIAN_STATES[0]);

  const categories = Array.from(new Set(services.map((s) => s.category)));
  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);

  return (
    <form action={action} className="max-w-3xl space-y-8">
      <div>
        <h2 className="font-display text-base font-bold text-text">Customer</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Name *</label>
            <input name="customerName" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Phone *</label>
            <input name="customerPhone" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Email</label>
            <input name="customerEmail" type="email" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          </div>
        </div>
        <p className="mt-1.5 text-xs text-text-muted">
          Matched to an existing customer by phone number if one already exists for this partner.
        </p>
      </div>

      <div>
        <h2 className="font-display text-base font-bold text-text">Address</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Address Line 1 *</label>
            <input name="line1" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Address Line 2</label>
            <input name="line2" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Landmark</label>
            <input name="landmark" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">City *</label>
            <input name="city" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">State *</label>
            <select name="state" value={state} onChange={(e) => setState(e.target.value)} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Pincode *</label>
            <input name="pincode" required pattern="\d{6}" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display text-base font-bold text-text">Service</h2>
        <div className="mt-3 space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">{cat}</div>
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
                        {s.name} <span className="text-xs text-text-muted">({s.minSkillLevel})</span>
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
        </div>
        {selectedService && (
          <p className="mt-2 text-sm text-text-muted">
            Est. duration: {selectedService.durationMinutes} min · Price: ₹{(selectedService.basePrice / 100).toLocaleString("en-IN")}
            {selectedService.priceType === "hourly" ? "/hr" : ""}
          </p>
        )}
      </div>

      <div>
        <h2 className="font-display text-base font-bold text-text">Schedule</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Date *</label>
            <input name="scheduledDate" type="date" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Time Slot *</label>
            <select name="slotLabel" required defaultValue="" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
              <option value="" disabled>
                Select a slot
              </option>
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Notes</label>
          <textarea name="notes" rows={3} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" placeholder="Anything the engineer should know before arriving" />
        </div>
      </div>

      <button type="submit" className="btn-accent">
        Create Booking
      </button>
    </form>
  );
}
