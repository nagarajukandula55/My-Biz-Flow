"use client";

import { useState } from "react";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { StatusChip } from "@/components/StatusChip";
import { MODULES } from "@/lib/designer/modules";
import { requestModuleAccessAction, saveBusinessDetailsAction } from "./actions";
import { LogoUploadForm } from "./LogoUploadForm";
// Data Export / Backup is hidden for now per product decision — the button,
// its underlying Server Action and download route are untouched, just not
// linked from the UI. Flip SHOW_DATA_BACKUP back to true (and re-add the
// section below) to bring it back; nothing was deleted.
import { DataBackupDownloadButton } from "./DataBackupDownloadButton";

const SHOW_DATA_BACKUP = false;
// "Enabled Modules" hidden from the partner-facing Settings page per direct
// product decision — the request/approve flow underneath (
// requestModuleAccessAction, /admin/access-keys review) is fully intact,
// this only stops rendering the grid. Same pattern as SHOW_DATA_BACKUP
// above; flip back to true to restore it, nothing was deleted.
const SHOW_ENABLED_MODULES = false;

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
 * call the fs-based, override-aware buildPartnerAdminNavGroups(), which
 * cannot run in a Client Component — see modules.ts's header).
 */
export function SettingsPageClient({
  visibleModuleSlugs,
  moduleStatuses,
  partnerId,
  businessDetails,
}: {
  visibleModuleSlugs: string[];
  /** Real ModuleAccessKey state per module (src/lib/designer/accessKeys.ts) — "active", "requested" (pending Super Admin review), or absent (never requested / previously denied). */
  moduleStatuses: Record<string, "active" | "requested" | "none">;
  partnerId: string;
  /** This partner's real stored Business Details fields + logo — prefills the form below and the Logo uploader. */
  businessDetails: {
    businessName: string;
    address: string;
    gstin: string;
    timezone: string;
    currency: string;
    logoDataUrl: string | null;
  };
}) {
  const visibleSet = new Set(visibleModuleSlugs);
  const [serializedInventory, setSerializedInventory] = useState(false);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-text">Settings</h1>
      <p className="mt-1 text-sm text-text-muted">
        Partner profile, branding, and enabled modules. Business Name/Address/GSTIN/Timezone/Currency and
        Logo below, plus the Business Profile, Bank Details, Config and Numbering tabs further down, are
        all real, persisted settings.
      </p>

      <div className="mt-6">
        <RecordForm
          fields={SETTINGS_FIELDS}
          submitLabel="Save settings"
          initialValues={businessDetails}
          action={saveBusinessDetailsAction.bind(null, partnerId)}
        />
      </div>

      <LogoUploadForm partnerId={partnerId} currentLogoDataUrl={businessDetails.logoDataUrl} />

      {SHOW_ENABLED_MODULES && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-text">Enabled Modules</h2>
          <p className="mt-1 text-sm text-text-muted">
            All 21 modules from the canonical registry, with this partner&apos;s real access state. A module
            can no longer be turned on directly from here — request it instead, and a Super Admin approves or
            denies the request from Access Keys.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => {
              const status = moduleStatuses[m.slug] ?? "none";
              return (
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
                  {status === "active" ? (
                    <span className="shrink-0 rounded-md bg-success-soft px-2 py-1 text-xs font-semibold text-success">
                      Active
                    </span>
                  ) : status === "requested" ? (
                    <span className="shrink-0 rounded-md bg-warning-soft px-2 py-1 text-xs font-semibold text-warning">
                      Requested
                    </span>
                  ) : (
                    <form action={requestModuleAccessAction.bind(null, partnerId)}>
                      <input type="hidden" name="moduleSlug" value={m.slug} />
                      <button
                        type="submit"
                        className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-text hover:border-accent hover:text-accent"
                      >
                        Request access
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {SHOW_DATA_BACKUP && (
        <div className="mt-8 max-w-2xl">
          <h2 className="font-display text-lg font-bold text-text">Data Export / Backup</h2>
          <p className="mt-1 text-sm text-text-muted">
            Download every record you own across all modules (POS, Billing, Service Centre, Inventory, and
            the rest) as a single JSON file — a local copy for your own records, independent of this app.
            Your database itself already has automatic point-in-time backups on the hosting side; this is a
            personal export, not a substitute for that.
          </p>
          <div className="mt-4">
            <DataBackupDownloadButton partnerId={partnerId} />
          </div>
        </div>
      )}

      {visibleSet.has("inventory") && (
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
