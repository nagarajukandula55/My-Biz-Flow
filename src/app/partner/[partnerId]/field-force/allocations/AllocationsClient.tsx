"use client";

import { useMemo, useState } from "react";
import { StatusChip } from "@/components/StatusChip";
import type { EngineerRecord } from "@/lib/fieldForce/engineersData";
import { findEligibleEngineers } from "@/lib/fieldForce/matching";

type ServiceOption = { id: string; name: string; category: string };
type AllocationRow = {
  id: string;
  engineerName: string;
  jobRef: string;
  status: string;
  assignedAt: string;
};

export function AllocationsClient({
  engineers,
  services,
  allocations,
  allocateAction,
  updateStatusAction,
}: {
  engineers: EngineerRecord[];
  services: ServiceOption[];
  allocations: AllocationRow[];
  allocateAction: (formData: FormData) => void;
  updateStatusAction: (formData: FormData) => void;
}) {
  const [jobRef, setJobRef] = useState("");
  const [pincode, setPincode] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

  const candidates = useMemo(() => {
    if (!pincode || selectedServiceIds.size === 0) return [];
    return findEligibleEngineers(engineers, {
      pincode,
      requiredServiceIds: Array.from(selectedServiceIds),
    });
  }, [engineers, pincode, selectedServiceIds]);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">Find engineers for a job</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Job Reference
            </label>
            <input
              value={jobRef}
              onChange={(e) => setJobRef(e.target.value)}
              placeholder="e.g. workorder id"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Job Pincode
            </label>
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Required Services
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
                <input type="checkbox" checked={selectedServiceIds.has(s.id)} onChange={() => toggleService(s.id)} />
                {s.name}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Matching engineers ({candidates.length})
          </div>
          {candidates.length === 0 ? (
            <p className="text-sm text-text-muted">Enter a pincode and select at least one service to see matches.</p>
          ) : (
            <div className="space-y-2">
              {candidates.map((c) => (
                <form key={c.id} action={allocateAction} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2">
                  <input type="hidden" name="jobRef" value={jobRef} />
                  <input type="hidden" name="engineerId" value={c.id} />
                  <div className="text-sm text-text">
                    {c.name} <span className="text-text-muted">({c.phone})</span>
                  </div>
                  <button type="submit" disabled={!jobRef} className="btn-accent text-xs disabled:opacity-50">
                    Assign
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-base font-bold text-text">Current allocations</h2>
        {allocations.length === 0 ? (
          <p className="mt-2 rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
            No allocations yet.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {allocations.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-3 py-2.5">
                <div>
                  <div className="text-sm font-semibold text-text">{a.jobRef}</div>
                  <div className="text-xs text-text-muted">{a.engineerName}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip
                    label={a.status}
                    variant={a.status === "done" ? "success" : a.status === "cancelled" ? "danger" : "teal"}
                  />
                  <form action={updateStatusAction} className="flex items-center gap-1">
                    <input type="hidden" name="allocationId" value={a.id} />
                    <select name="status" defaultValue={a.status} className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text">
                      <option value="assigned">Assigned</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button type="submit" className="btn-ghost text-xs">
                      Update
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
