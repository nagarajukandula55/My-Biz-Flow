"use client";

import type { OfferRecord } from "@/lib/subscriptionData";
import { BILLING_CYCLES, cycleLabel } from "@/lib/subscriptionData";

function toDateInputValue(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function OfferForm({
  action,
  submitLabel,
  plans,
  initial,
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  plans: { id: string; name: string }[];
  initial?: OfferRecord;
}) {
  return (
    <form action={action}>
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Name</label>
          <input
            name="name"
            required
            defaultValue={initial?.name}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Description</label>
          <textarea
            name="description"
            rows={2}
            defaultValue={initial?.description}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Discount Type
            </label>
            <select
              name="discountType"
              defaultValue={initial?.discountType ?? "percent"}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            >
              <option value="percent">Percent off</option>
              <option value="flat">Flat amount off (INR)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Discount Value
            </label>
            <input
              name="discountValue"
              type="number"
              min={0}
              defaultValue={initial?.discountValue ?? 0}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Applies to Plans
          </label>
          <p className="mb-2 text-xs text-text-muted">Leave all unchecked to apply to every Plan.</p>
          <div className="space-y-1.5 rounded-md border border-border bg-bg p-3">
            {plans.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  name="planIds"
                  value={p.id}
                  defaultChecked={initial?.planIds.includes(p.id)}
                  className="h-4 w-4 accent-accent"
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Applies to Billing Cycles
          </label>
          <p className="mb-2 text-xs text-text-muted">Leave all unchecked to apply to every cycle.</p>
          <div className="space-y-1.5 rounded-md border border-border bg-bg p-3">
            {BILLING_CYCLES.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  name="billingCycles"
                  value={c}
                  defaultChecked={initial?.billingCycles.includes(c)}
                  className="h-4 w-4 accent-accent"
                />
                {cycleLabel(c)}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Valid From
            </label>
            <input
              name="validFrom"
              type="date"
              defaultValue={toDateInputValue(initial?.validFrom ?? null)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Valid To
            </label>
            <input
              name="validTo"
              type="date"
              defaultValue={toDateInputValue(initial?.validTo ?? null)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" name="isCombo" defaultChecked={initial?.isCombo} className="h-4 w-4 accent-accent" />
            Combo bundle (multiple Plans together)
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={initial?.isActive ?? true}
              className="h-4 w-4 accent-accent"
            />
            Active
          </label>
        </div>
      </div>

      <div className="mt-6">
        <button type="submit" className="btn-accent">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
