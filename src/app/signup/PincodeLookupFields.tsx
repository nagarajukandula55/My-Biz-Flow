"use client";

import { useState } from "react";
import { INDIAN_STATES, lookupPincode } from "@/lib/sample-data/geo";

/**
 * Pincode -> state/city autofill. Looks up the curated sample table
 * (lookupPincode — see src/lib/sample-data/geo.ts) first; if the pincode
 * isn't found there, falls back to a State dropdown + free-text City,
 * since we don't have a full city list per state yet. Swapping the lookup
 * for central-api's real pincode database later is a one-line change —
 * same input/output shape.
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
  const [found, setFound] = useState(false);

  function handlePincodeChange(value: string) {
    setPincode(value);
    if (value.length === 6) {
      const match = lookupPincode(value);
      if (match) {
        setState(match.state);
        setCity(match.city);
        setFound(true);
        return;
      }
    }
    setFound(false);
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
      </label>

      <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        State
        {found ? (
          <>
            <input type="text" name="state" value={state} readOnly className="mt-1 w-full rounded-md border border-border bg-bg-sunken px-3 py-2 text-sm text-text" />
          </>
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
        <input
          type="text"
          name="city"
          required
          readOnly={found}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={`mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-text outline-none focus:border-teal ${
            found ? "bg-bg-sunken" : "bg-bg"
          }`}
        />
      </label>

      {!found && pincode.length === 6 && (
        <p className="sm:col-span-3 text-xs text-text-muted">
          Pincode not in our lookup yet — please select your state and enter your city manually.
        </p>
      )}
    </div>
  );
}
