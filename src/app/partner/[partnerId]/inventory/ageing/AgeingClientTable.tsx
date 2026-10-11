"use client";

import { useState } from "react";
import { StatusChip, type StatusVariant } from "@/components/StatusChip";
import type { AgeingRow } from "@/lib/inventoryAgeing";
import { RecordCsvExportButton } from "@/components/RecordCsvExportButton";

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
const PAGE_SIZE = 25;

export function AgeingClientTable({ rows }: { rows: AgeingRow[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = search.trim().toLowerCase();
  const searchedRows = !q
    ? rows
    : rows.filter((r) => `${r.materialId} ${r.warehouseName} ${r.condition} ${r.status}`.toLowerCase().includes(q));
  // CSV export stays on searchedRows (every match, not just this page) —
  // only the rendered <table> below is capped to one page at a time.
  const totalPages = Math.max(1, Math.ceil(searchedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = searchedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search material, warehouse…"
          className="w-full max-w-xs rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text outline-none focus:border-accent sm:w-72"
        />
        <RecordCsvExportButton
          filename="material-ageing.csv"
          columns={["materialId", "warehouseName", "condition", "qtyOnHand", "lastReceivedAt", "ageDays", "status", "serialNumbers"]}
          rows={searchedRows.map((r) => ({
            materialId: r.materialId,
            warehouseName: r.warehouseName,
            condition: r.condition,
            qtyOnHand: r.qtyOnHand,
            lastReceivedAt: r.lastReceivedAt,
            ageDays: r.ageDays,
            status: r.status,
            serialNumbers: r.serialNumbers ? r.serialNumbers.join("; ") : "",
          }))}
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
                <th className="px-3 py-2.5">Serial / Barcode Numbers</th>
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
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {r.serialNumbers ? (r.serialNumbers.length > 0 ? r.serialNumbers.join(", ") : "—") : ""}
                  </td>
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
      {searchedRows.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-text-muted">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(searchedRows.length, currentPage * PAGE_SIZE)} of {searchedRows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className={`rounded-md border border-border px-3 py-1.5 ${currentPage <= 1 ? "opacity-40" : "hover:bg-bg-sunken"}`}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className={`rounded-md border border-border px-3 py-1.5 ${currentPage >= totalPages ? "opacity-40" : "hover:bg-bg-sunken"}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
