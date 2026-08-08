"use client";

import { useState } from "react";
import { INDIAN_STATES } from "@/lib/sample-data/geo";

/**
 * Pincode -> state/city lookup, backed by /api/pincode (India Post's
 * public pincode API, proxied server-side — see that route for why: a
 * live stand-in until central-api's own pincode table is wired up, one
 * function to swap later). On any failure/not-found, falls back to a
 * State dropdown + free-text City.
 */
export function PincodeLookupFields({
  initialState = "",
  initialCity = "",
  initialPincode = "",
}: {
  initialState?: string;
  initialCity?: string;
  initialPincode?: string;
}) {
  const [pincode, setPincode] = useState(initialPincode);
  const [state, setState] = useState(initialState);
  const [city, setCity] = useState(initialCity);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [found, setFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualFallback, setManualFallback] = useState(false);

  async function handlePincodeChange(value: string) {
    setPincode(value);
    if (value.length !== 6) {
      setFound(false);
      setManualFallback(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/pincode?code=${value}`);
      const data: { found: boolean; state?: string; cities?: string[] } = await res.json();
      if (data.found && data.state && data.cities && data.cities.length > 0) {
        setState(data.state);
        setCityOptions(data.cities);
        setCity(data.cities[0]);
        setFound(true);
        setManualFallback(false);
      } else {
        setFound(false);
        setManualFallback(true);
      }
    } catch {
      setFound(false);
      setManualFallback(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Pincode
        <input
          type="text"
          name="pincode"
          required
          maxLength={6}
          value={pincode}
          onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, ""))}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
        />
        {loading && <span className="mt-1 block text-[11px] font-normal normal-case text-text-muted">Looking up…</span>}
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        State
        {found ? (
          <input
            type="text"
            name="state"
            value={state}
            readOnly
            className="mt-1 w-full rounded-md border border-border bg-bg-sunken px-3 py-2 text-sm text-text"
          />
        ) : (
          <select
            name="state"
            required
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        City
        {found && cityOptions.length > 0 ? (
          <select
            name="city"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          >
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            name="city"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          />
        )}
      </label>

      {manualFallback && (
        <p className="text-xs text-text-muted sm:col-span-3">
          Couldn&apos;t look up that pincode — please select your state and enter your city manually.
        </p>
      )}
    </div>
  );
}
