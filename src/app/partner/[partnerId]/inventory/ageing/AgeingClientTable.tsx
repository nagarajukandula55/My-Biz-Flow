"use client";

import { useState } from "react";
import { StatusChip, type StatusVariant } from "@/components/StatusChip";
import type { AgeingRow } from "@/lib/inventoryAgeing";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Fresh: "success",
  Watch: "warning",
  Aging: "danger",
};

/**
 * Client-side search over an already-fetched, bounded per-partner ageing
 * row set — same "filter what's already loaded, no network call per
 * keystroke" pattern as DataTable's own enableSearch (see
 * src/components/DataTable.tsx), reimplemented here rather than through
 * DataTable itself since this list predates DataTable and has its own
 * bespoke columns (Age (days), Status chip banding) not worth forcing
 * through DataTable's generic Column shape for this one page.
 */
export function AgeingClientTable({ rows }: { rows: AgeingRow[] }) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const visibleRows = !q
    ? rows
    : rows.filter((r) => `${r.materialId} ${r.warehouseName} ${r.condition} ${r.status}`.toLowerCase().includes(q));

  return (
    <div>
      <div className="mt-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search material, warehouse…"
          className="w-full max-w-xs rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text outline-none focus:border-accent sm:w-72"
        />
      </div>

      {visibleRows.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
          No matching rows.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-bg-raised">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2.5">Material</th>
                <th className="px-3 py-2.5">Warehouse</th>
                <th className="px-3 py-2.5">Material Type</th>
                <th className="px-3 py-2.5 text-right">Qty</th>
                <th className="px-3 py-2.5">Last Received</th>
                <th className="px-3 py-2.5 text-right">Age (days)</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.stockId} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2">{r.materialId}</td>
                  <td className="px-3 py-2">{r.warehouseName}</td>
                  <td className="px-3 py-2">{r.condition}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.qtyOnHand}</td>
                  <td className="px-3 py-2">{new Date(r.lastReceivedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.ageDays}</td>
                  <td className="px-3 py-2">
                    <StatusChip label={r.status} variant={STATUS_VARIANT[r.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
