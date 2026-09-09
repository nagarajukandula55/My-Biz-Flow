"use client";

import { useState } from "react";
import { INDIAN_STATES, districtsForState } from "@/lib/sample-data/geo";

type ServiceOption = { id: string; name: string; category: string };

type AreaRow = {
  mode: "region" | "pincode";
  state: string;
  district: string;
  locality: string;
  pincode: string;
};

const EMPTY_ROW: AreaRow = { mode: "region", state: INDIAN_STATES[0], district: "", locality: "", pincode: "" };

export function ProviderOnboardForm({
  services,
  action,
}: {
  services: ServiceOption[];
  action: (formData: FormData) => void;
}) {
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [areas, setAreas] = useState<AreaRow[]>([]);

  const categories = Array.from(new Set(services.map((s) => s.category)));

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateArea(index: number, patch: Partial<AreaRow>) {
    setAreas((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function addArea() {
    setAreas((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeArea(index: number) {
    setAreas((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(formData: FormData) {
    formData.set("serviceIds", "");
    selectedServiceIds.forEach((id) => formData.append("serviceIds", id));

    const serviceAreas = areas.map((a) =>
      a.mode === "pincode"
        ? { state: a.state, pincode: a.pincode }
        : { state: a.state, district: a.district || undefined, locality: a.locality || undefined }
    );
    formData.set("serviceAreas", JSON.stringify(serviceAreas));
    action(formData);
  }

  return (
    <form action={handleSubmit} className="max-w-3xl space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Full Name *
          </label>
          <input name="name" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Phone *
          </label>
          <input name="phone" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Email
          </label>
          <input name="email" type="email" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Pincode * <span className="normal-case text-text-muted">(mandatory — your primary coverage area)</span>
          </label>
          <input name="pincode" required pattern="\d{6}" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Recruited From (source)
          </label>
          <input name="source" placeholder="e.g. referral, job portal, walk-in" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Worker Type *
          </label>
          <select name="skillLevel" defaultValue="skilled" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
            <option value="skilled">Skilled (trained/certified trade)</option>
            <option value="unskilled">Unskilled (general help)</option>
          </select>
        </div>
      </div>

      <div>
        <h2 className="font-display text-base font-bold text-text">Services offered</h2>
        <p className="mt-1 text-sm text-text-muted">Select as many as apply — no limit.</p>
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
                      className="flex items-center gap-2 rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text"
                    >
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.has(s.id)}
                        onChange={() => toggleService(s.id)}
                      />
                      {s.name}
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-base font-bold text-text">Additional serviceable areas</h2>
        <p className="mt-1 text-sm text-text-muted">
          Beyond your primary pincode above, add any extra areas you cover — each row is either a
          state/district/locality combination, or a single pincode.
        </p>
        <div className="mt-3 space-y-3">
          {areas.map((area, i) => (
            <div key={i} className="rounded-md border border-border bg-bg-raised p-3">
              <div className="mb-2 flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-text">
                  <input
                    type="radio"
                    name={`mode-${i}`}
                    checked={area.mode === "region"}
                    onChange={() => updateArea(i, { mode: "region" })}
                  />
                  State / District / Locality
                </label>
                <label className="flex items-center gap-1.5 text-xs text-text">
                  <input
                    type="radio"
                    name={`mode-${i}`}
                    checked={area.mode === "pincode"}
                    onChange={() => updateArea(i, { mode: "pincode" })}
                  />
                  Individual Pincode
                </label>
                <button type="button" onClick={() => removeArea(i)} className="ml-auto text-xs text-danger">
                  Remove
                </button>
              </div>

              {area.mode === "region" ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <select
                    value={area.state}
                    onChange={(e) => updateArea(i, { state: e.target.value, district: "" })}
                    className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {districtsForState(area.state).length > 0 ? (
                    <select
                      value={area.district}
                      onChange={(e) => updateArea(i, { district: e.target.value })}
                      className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
                    >
                      <option value="">Whole state</option>
                      {districtsForState(area.state).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      placeholder="District (optional)"
                      value={area.district}
                      onChange={(e) => updateArea(i, { district: e.target.value })}
                      className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
                    />
                  )}
                  <input
                    placeholder="Locality (optional)"
                    value={area.locality}
                    onChange={(e) => updateArea(i, { locality: e.target.value })}
                    className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
                  />
                </div>
              ) : (
                <input
                  placeholder="Pincode"
                  value={area.pincode}
                  onChange={(e) => updateArea(i, { pincode: e.target.value })}
                  className="w-full max-w-xs rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
                />
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addArea} className="btn-ghost mt-3 text-xs">
          + Add another area
        </button>
      </div>

      <button type="submit" className="btn-accent">
        Onboard Provider
      </button>
    </form>
  );
}
