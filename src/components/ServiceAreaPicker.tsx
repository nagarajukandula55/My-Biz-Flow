"use client";

import { useState } from "react";

/**
 * State -> City (expand) -> Pincode (expand) picker for Service Centre
 * coverage areas — replaces a flat "type in your pincodes" textarea with
 * real, browsable data from the postal_pincodes table. Cities and pincodes
 * are lazy-loaded per state/city on expand (via /api/geo/cities,
 * /api/geo/pincodes) rather than preloaded, since the table has ~150k rows.
 *
 * Selected pincodes are tracked locally and submitted through a single
 * hidden `pincodesText` input (comma-joined) — the same field name the
 * previous free-text textarea used, so the server actions
 * (saveServiceAreaAction, updatePartnerServiceAreaAction) needed no
 * changes at all, only this input's markup did.
 */
export function ServiceAreaPicker({ states, initialSelectedPincodes }: { states: string[]; initialSelectedPincodes: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelectedPincodes));
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [citiesByState, setCitiesByState] = useState<Record<string, string[]>>({});
  const [pincodesByCity, setPincodesByCity] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  function togglePincode(pincode: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pincode)) next.delete(pincode);
      else next.add(pincode);
      return next;
    });
  }

  async function toggleState(state: string) {
    setExpandedStates((prev) => {
      const next = new Set(prev);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });
    if (!citiesByState[state]) {
      setLoading((prev) => new Set(prev).add(`state:${state}`));
      const res = await fetch(`/api/geo/cities?state=${encodeURIComponent(state)}`);
      const data = (await res.json()) as { cities: string[] };
      setCitiesByState((prev) => ({ ...prev, [state]: data.cities }));
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(`state:${state}`);
        return next;
      });
    }
  }

  async function toggleCity(state: string, city: string) {
    const key = `${state}::${city}`;
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    if (!pincodesByCity[key]) {
      setLoading((prev) => new Set(prev).add(`city:${key}`));
      const res = await fetch(`/api/geo/pincodes?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}`);
      const data = (await res.json()) as { pincodes: string[] };
      setPincodesByCity((prev) => ({ ...prev, [key]: data.pincodes }));
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(`city:${key}`);
        return next;
      });
    }
  }

  function selectAllInCity(state: string, city: string) {
    const key = `${state}::${city}`;
    const pins = pincodesByCity[key] ?? [];
    setSelected((prev) => new Set([...prev, ...pins]));
  }

  function clearCity(state: string, city: string) {
    const key = `${state}::${city}`;
    const pins = new Set(pincodesByCity[key] ?? []);
    setSelected((prev) => new Set([...prev].filter((p) => !pins.has(p))));
  }

  const filteredStates = filter.trim()
    ? states.filter((s) => s.toLowerCase().includes(filter.trim().toLowerCase()))
    : states;

  return (
    <div>
      <input type="hidden" name="pincodesText" value={Array.from(selected).join(",")} />

      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter states…"
          className="w-full max-w-xs rounded-md border border-border bg-bg px-3 py-1.5 text-sm normal-case text-text outline-none focus:border-accent"
        />
        <span className="shrink-0 text-xs font-semibold text-text-muted">{selected.size} pincode{selected.size === 1 ? "" : "s"} selected</span>
      </div>

      <div className="mt-3 max-h-80 overflow-y-auto rounded-md border border-border">
        {filteredStates.length === 0 && (
          <p className="p-3 text-sm text-text-muted">No states match.</p>
        )}
        {filteredStates.map((state) => {
          const stateOpen = expandedStates.has(state);
          return (
            <div key={state} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => toggleState(state)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-text hover:bg-bg-raised"
              >
                <span>{stateOpen ? "▾" : "▸"} {state}</span>
                {loading.has(`state:${state}`) && <span className="text-xs text-text-muted">Loading…</span>}
              </button>
              {stateOpen && (
                <div className="pl-4">
                  {(citiesByState[state] ?? []).map((city) => {
                    const cityKey = `${state}::${city}`;
                    const cityOpen = expandedCities.has(cityKey);
                    const pins = pincodesByCity[cityKey] ?? [];
                    const allSelected = pins.length > 0 && pins.every((p) => selected.has(p));
                    return (
                      <div key={city} className="border-t border-border first:border-t-0">
                        <div className="flex items-center justify-between px-3 py-1.5">
                          <button
                            type="button"
                            onClick={() => toggleCity(state, city)}
                            className="flex-1 text-left text-sm text-text hover:underline"
                          >
                            {cityOpen ? "▾" : "▸"} {city}
                          </button>
                          {cityOpen && pins.length > 0 && (
                            <button
                              type="button"
                              onClick={() => (allSelected ? clearCity(state, city) : selectAllInCity(state, city))}
                              className="shrink-0 text-xs font-semibold text-accent hover:underline"
                            >
                              {allSelected ? "Clear all" : "Select all"}
                            </button>
                          )}
                        </div>
                        {cityOpen && (
                          <div className="flex flex-wrap gap-2 px-6 pb-2">
                            {loading.has(`city:${cityKey}`) && <span className="text-xs text-text-muted">Loading…</span>}
                            {pins.map((p) => (
                              <label
                                key={p}
                                className={`cursor-pointer rounded-md border px-2 py-1 text-xs tabular-nums ${
                                  selected.has(p)
                                    ? "border-accent bg-accent-soft text-accent"
                                    : "border-border text-text-muted hover:border-accent"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.has(p)}
                                  onChange={() => togglePincode(p)}
                                  className="hidden"
                                />
                                {p}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
