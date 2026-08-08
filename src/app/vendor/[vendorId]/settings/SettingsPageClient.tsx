"use client";

import { useState } from "react";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { StatusChip } from "@/components/StatusChip";
import { MODULES } from "@/lib/designer/modules";

const SETTINGS_FIELDS: FormFieldDef[] = [
  { key: "businessName", label: "Business Name", type: "text", required: true, placeholder: "e.g. Demo Retail Co." },
  { key: "address", label: "Address", type: "textarea", required: false },
  { key: "gstin", label: "GSTIN", type: "text", required: false, placeholder: "22AAAAA0000A1Z5" },
  { key: "timezone", label: "Timezone", type: "select", required: true, options: ["Asia/Kolkata", "Asia/Dubai", "UTC"] },
  { key: "currency", label: "Currency", type: "select", required: true, options: ["INR", "USD", "AED"] },
];

/**
 * The interactive body of the Settings page — split into its own Client
 * Component so page.tsx itself can stay a Server Component (it needs to
 * call the fs-based, override-aware buildVendorAdminNavGroups(), which
 * cannot run in a Client Component — see modules.ts's header).
 */
export function SettingsPageClient() {
  const [logoName, setLogoName] = useState<string | null>(null);
  // No real per-vendor enabled-modules data yet — every module is shown as
  // "enabled" by default; the toggle is visually real but does not persist.
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULES.map((m) => [m.slug, true]))
  );
  const [serializedInventory, setSerializedInventory] = useState(false);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-text">Settings</h1>
      <p className="mt-1 text-sm text-text-muted">
        Vendor profile, branding, and enabled modules. Demo stubs throughout — no backend persistence yet.
      </p>

      <div className="mt-6">
        <RecordForm fields={SETTINGS_FIELDS} submitLabel="Save settings" />
      </div>

      <div className="mt-8 max-w-2xl">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Logo
        </label>
        <div className="flex items-center gap-4 rounded-md border border-border bg-bg p-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-bg-sunken text-xs text-text-muted">
            {logoName ? "IMG" : "—"}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoName(e.target.files?.[0]?.name ?? null)}
              className="text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent-contrast"
            />
            <p className="mt-1 text-xs text-text-muted">
              {logoName ? `Selected: ${logoName} (demo — not actually uploaded anywhere)` : "No file uploaded yet — this input does not upload anywhere (demo stub)."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-bold text-text">Enabled Modules</h2>
        <p className="mt-1 text-sm text-text-muted">
          All 21 modules from the canonical registry, shown with a toggle. There is no real per-vendor
          enabled-modules record yet — toggling here is visually real but does not persist (demo stub, same
          honesty pattern as the rest of this codebase).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <div
              key={m.slug}
              className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-3 py-2.5"
            >
              <div>
                <div className="text-sm font-semibold text-text">{m.label}</div>
                <StatusChip
                  label={m.taxonomy}
                  variant={m.taxonomy === "vertical" ? "teal" : m.taxonomy === "brand" ? "amber" : "neutral"}
                  className="mt-1"
                />
              </div>
              <button
                type="button"
                onClick={() => setEnabled((prev) => ({ ...prev, [m.slug]: !prev[m.slug] }))}
                className={`h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                  enabled[m.slug] ? "bg-accent" : "bg-bg-sunken"
                }`}
                aria-pressed={enabled[m.slug]}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-bg-raised shadow transition-transform ${
                    enabled[m.slug] ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {enabled["inventory"] && (
        <div className="mt-8 max-w-2xl">
          <h2 className="font-display text-lg font-bold text-text">Serialized Inventory</h2>
          <p className="mt-1 text-sm text-text-muted">
            When enabled, materials can be tracked by Serial/IMEI number and workorders will validate
            against Inventory/Warehouse stock before closing. Only shown here because the Inventory /
            Warehouse module is enabled above — demo stub, does not persist yet.
          </p>
          <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-bg-raised px-3 py-2.5">
            <div>
              <div className="text-sm font-semibold text-text">Serialized Inventory</div>
              <div className="mt-0.5 text-xs text-text-muted">
                Enables serial/IMEI tracking across the Inventory and Warehouse module.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSerializedInventory((v) => !v)}
              className={`h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                serializedInventory ? "bg-accent" : "bg-bg-sunken"
              }`}
              aria-pressed={serializedInventory}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-bg-raised shadow transition-transform ${
                  serializedInventory ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
