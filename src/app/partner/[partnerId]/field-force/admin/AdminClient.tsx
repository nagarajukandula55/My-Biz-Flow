"use client";

import { StatusChip } from "@/components/StatusChip";
import type { EngineerRecord } from "@/lib/fieldForce/engineersData";

type ServiceRow = { id: string; name: string; category: string; isActive: boolean };

export function FieldForceAdminClient({
  engineers,
  services,
  setEngineerStatusAction,
  createServiceAction,
  setServiceActiveAction,
}: {
  engineers: EngineerRecord[];
  services: ServiceRow[];
  setEngineerStatusAction: (formData: FormData) => void;
  createServiceAction: (formData: FormData) => void;
  setServiceActiveAction: (formData: FormData) => void;
}) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-base font-bold text-text">Engineers</h2>
        <div className="mt-3 space-y-2">
          {engineers.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-3 py-2.5">
              <div>
                <div className="text-sm font-semibold text-text">{e.name}</div>
                <div className="text-xs text-text-muted">
                  {e.phone} · {e.services.length} service{e.services.length === 1 ? "" : "s"} ·{" "}
                  {e.serviceAreas.length} area{e.serviceAreas.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip
                  label={e.status}
                  variant={e.status === "active" ? "success" : e.status === "suspended" ? "danger" : "warning"}
                />
                <form action={setEngineerStatusAction} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={e.id} />
                  <select name="status" defaultValue={e.status} className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text">
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
        <h2 className="font-display text-base font-bold text-text">Service catalog</h2>
        <p className="mt-1 text-sm text-text-muted">
          Add, or deactivate, the services engineers can choose from during onboarding.
        </p>
        <form action={createServiceAction} className="mt-3 flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Name</label>
            <input name="name" required className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Category</label>
            <input name="category" required placeholder="Electrical / Electronics" className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text" />
          </div>
          <button type="submit" className="btn-accent text-xs">
            + Add Service
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-3 py-2">
              <div className="text-sm text-text">
                {s.name} <span className="text-text-muted">({s.category})</span>
              </div>
              <form action={setServiceActiveAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="isActive" value={String(!s.isActive)} />
                <StatusChip label={s.isActive ? "Active" : "Inactive"} variant={s.isActive ? "success" : "neutral"} />
                <button type="submit" className="btn-ghost text-xs">
                  {s.isActive ? "Deactivate" : "Activate"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
