"use client";

import { useState } from "react";
import { StatusChip } from "@/components/StatusChip";
import type { ProviderRecord } from "@/lib/fieldForce/providersData";
import type { ServiceRecord } from "@/lib/fieldForce/servicesData";
import type { FieldForceSettingsRecord } from "@/lib/fieldForce/settingsData";

export function FieldForceAdminClient({
  providers,
  services,
  settings,
  setProviderStatusAction,
  createServiceAction,
  setServiceActiveAction,
  updateServicePricingAction,
  updateSettingsAction,
}: {
  providers: ProviderRecord[];
  services: ServiceRecord[];
  settings: FieldForceSettingsRecord;
  setProviderStatusAction: (formData: FormData) => void;
  createServiceAction: (formData: FormData) => void;
  setServiceActiveAction: (formData: FormData) => void;
  updateServicePricingAction: (formData: FormData) => void;
  updateSettingsAction: (formData: FormData) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-base font-bold text-text">Self-signup</h2>
        <p className="mt-1 text-sm text-text-muted">
          Turn on public sign-up pages so Customers and Providers can register themselves for this partner.
        </p>
        <form action={updateSettingsAction} className="mt-3 flex flex-wrap items-center gap-6 rounded-md border border-border bg-bg-raised p-3">
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" name="customerSignupEnabled" value="true" defaultChecked={settings.customerSignupEnabled} />
            Allow Customer self-signup
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" name="providerSignupEnabled" value="true" defaultChecked={settings.providerSignupEnabled} />
            Allow Provider self-signup
          </label>
          <button type="submit" className="btn-accent text-xs">
            Save
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-base font-bold text-text">Providers</h2>
        <div className="mt-3 space-y-2">
          {providers.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 rounded-md border border-border bg-bg-raised px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-text">
                  {p.name} <span className="ml-1 text-xs font-normal text-text-muted">({p.skillLevel} · {p.pincode})</span>
                </div>
                <div className="text-xs text-text-muted">
                  {p.phone} · {p.services.length} service{p.services.length === 1 ? "" : "s"} ·{" "}
                  {p.serviceAreas.length} extra area{p.serviceAreas.length === 1 ? "" : "s"}
                  {p.hasLogin ? " · has login" : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip
                  label={p.status}
                  variant={p.status === "active" ? "success" : p.status === "suspended" ? "danger" : "warning"}
                />
                <form action={setProviderStatusAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={p.id} />
                  <select name="status" defaultValue={p.status} className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text">
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <button type="submit" className="btn-ghost text-xs">
                    Update
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-base font-bold text-text">Service catalog & pricing</h2>
        <p className="mt-1 text-sm text-text-muted">
          Add, price, or deactivate the services customers can book and providers choose from during onboarding.
        </p>
        <form action={createServiceAction} className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-dashed border-border bg-bg-raised p-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Name</label>
            <input name="name" required className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Category</label>
            <input name="category" required placeholder="e.g. Electrical, Cleaning" className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Worker Type</label>
            <select name="minSkillLevel" defaultValue="skilled" className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text">
              <option value="skilled">Skilled</option>
              <option value="unskilled">Unskilled</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Price Type</label>
            <select name="priceType" defaultValue="fixed" className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text">
              <option value="fixed">Fixed</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Price (₹)</label>
            <input name="basePrice" type="number" min="0" step="1" required className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Duration (min)</label>
            <input name="durationMinutes" type="number" min="15" step="15" defaultValue={60} required className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text" />
          </div>
          <div className="sm:col-span-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Description</label>
            <input name="description" className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-accent text-xs">
              + Add Service
            </button>
          </div>
        </form>

        <div className="mt-4 space-y-2">
          {services.map((s) => (
            <div key={s.id} className="rounded-md border border-border bg-bg-raised p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-text">
                  <span className="font-semibold">{s.name}</span>{" "}
                  <span className="text-text-muted">
                    ({s.category} · {s.minSkillLevel}) — ₹
                    {(s.basePrice / 100).toLocaleString("en-IN")}
                    {s.priceType === "hourly" ? "/hr" : ""} · {s.durationMinutes} min
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip label={s.isActive ? "Active" : "Inactive"} variant={s.isActive ? "success" : "neutral"} />
                  <button type="button" onClick={() => setEditingId(editingId === s.id ? null : s.id)} className="btn-ghost text-xs">
                    {editingId === s.id ? "Cancel" : "Edit price"}
                  </button>
                  <form action={setServiceActiveAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="isActive" value={String(!s.isActive)} />
                    <button type="submit" className="btn-ghost text-xs">
                      {s.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </div>
              </div>

              {editingId === s.id && (
                <form
                  action={(formData) => {
                    updateServicePricingAction(formData);
                    setEditingId(null);
                  }}
                  className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-4"
                >
                  <input type="hidden" name="id" value={s.id} />
                  <select name="priceType" defaultValue={s.priceType} className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text">
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                  </select>
                  <input name="basePrice" type="number" min="0" defaultValue={s.basePrice / 100} className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text" placeholder="Price (₹)" />
                  <input name="durationMinutes" type="number" min="15" step="15" defaultValue={s.durationMinutes} className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text" placeholder="Duration (min)" />
                  <select name="minSkillLevel" defaultValue={s.minSkillLevel} className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text">
                    <option value="skilled">Skilled</option>
                    <option value="unskilled">Unskilled</option>
                  </select>
                  <input name="description" defaultValue={s.description ?? ""} className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text sm:col-span-3" placeholder="Description" />
                  <button type="submit" className="btn-accent text-xs">
                    Save
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
