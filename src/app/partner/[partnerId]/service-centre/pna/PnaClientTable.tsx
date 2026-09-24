"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { RecordCsvExportButton } from "@/components/RecordCsvExportButton";
import { resolvePnaEntryAction, raisePartOrdersFromPnaAction } from "./actions";

export type PnaRow = {
  id: string;
  workorderId: string;
  materialId: string;
  /** Separate from materialName so staff/an export can order by the actual part name without parsing a combined "CODE — Description" string. */
  materialCode: string;
  materialName: string;
  qty: number;
  customerName: string;
  customerPhone: string;
  brandJobNo: string;
  status: string;
  createdDate: string;
  /** Live Available Qty text (e.g. "Central Warehouse — Bengaluru: 12 avail") for this row's material, computed server-side from the real Stock ledger — empty when nothing's on hand anywhere yet. */
  availableNow: string;
  /** Total Available Qty across every warehouse for this material — compared against `qty` to decide the Inventory tag (see availabilityTag below). */
  availableTotal: number;
};

const STATUS_FILTERS = ["All", "Open", "Ordered", "Fulfilled", "Closed (Workorder Closed)"] as const;

/** "Fulfilled" is stored plainly (matches resolvePnaEntryAction/analyticsData's getPnaOverview), but always DISPLAYED as "PNA Fulfilled" per explicit request — distinct at a glance from a Workorder's own "Closed"/"Completed" status chips elsewhere in this app. */
function displayStatus(status: string): string {
  return status === "Fulfilled" ? "PNA Fulfilled" : status;
}

function statusVariant(status: string): "success" | "warning" | "teal" | "neutral" {
  if (status === "Fulfilled") return "success";
  if (status === "Ordered") return "teal";
  if (status === "Closed (Workorder Closed)") return "neutral";
  return "warning";
}

/**
 * Three-way availability tag, distinct from the row's own tracking Status —
 * whether the required Qty is actually covered by real Stock right now:
 *  - "Inventory Available": total on-hand across every warehouse covers
 *    the full quantity needed for this line.
 *  - "Partially Available": something's on hand, but not enough — tagged
 *    separately (not lumped in with a full match) so staff know they still
 *    need to source the shortfall, not just collect what's already there.
 *  - "Still Unavailable": nothing on hand anywhere.
 */
function availabilityTag(row: PnaRow): { label: string; variant: "success" | "warning" | "danger" } {
  if (row.availableTotal <= 0) return { label: "Still Unavailable", variant: "danger" };
  if (row.availableTotal >= row.qty) return { label: "Inventory Available", variant: "success" };
  return { label: `Partially Available (need ${row.qty - row.availableTotal} more)`, variant: "warning" };
}

/**
 * Owner/staff work queue for parts marked "Part Not Available" on a
 * workorder (see WorkorderLifecycle's PNA modal / createPnaEntryAction).
 * A plain custom table rather than the shared DataTable, since it needs
 * row selection + a live-computed availability chip + a "Mark Fulfilled"
 * action DataTable's column model doesn't cover.
 */
export function PnaClientTable({
  partnerId,
  rows,
  warehouseOptions,
}: {
  partnerId: string;
  rows: PnaRow[];
  warehouseOptions: { value: string; label: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poWarehouse, setPoWarehouse] = useState(warehouseOptions[0]?.label ?? "");
  const [poDestination, setPoDestination] = useState("Service Centre");
  const [poSubmitting, setPoSubmitting] = useState(false);
  const [poResult, setPoResult] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.materialCode.toLowerCase().includes(q) ||
        r.materialName.toLowerCase().includes(q) ||
        r.workorderId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.toLowerCase().includes(q) ||
        r.brandJobNo.toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, search]);

  const selectableIds = useMemo(() => filtered.filter((r) => r.status === "Open").map((r) => r.id), [filtered]);
  const allSelectableSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected((prev) => {
      if (allSelectableSelected) return new Set();
      return new Set(selectableIds);
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submitRaisePo() {
    setPoResult(null);
    setPoSubmitting(true);
    startTransition(() => {
      raisePartOrdersFromPnaAction(partnerId, {
        pnaIds: Array.from(selected),
        sourceWarehouseName: poWarehouse,
        destinationLocation: poDestination,
      })
        .then((res) => {
          setPoSubmitting(false);
          if (res.createdCount > 0) {
            setSelected(new Set());
            setPoModalOpen(false);
          } else {
            setPoResult(res.errors.join("; ") || "Nothing was raised.");
          }
        })
        .catch((error) => {
          setPoSubmitting(false);
          setPoResult(error instanceof Error ? error.message : "Couldn't raise the Part Order(s). Please try again.");
        });
    });
  }

  const exportRows = filtered.map((r) => ({
    workorderId: r.workorderId,
    materialCode: r.materialCode || r.materialId,
    partName: r.materialName,
    qty: r.qty,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    brandJobNo: r.brandJobNo,
    availability: availabilityTag(r).label,
    availableNow: r.availableNow,
    status: displayStatus(r.status),
    loggedDate: r.createdDate,
  }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                statusFilter === f ? "border-accent bg-accent text-accent-contrast" : "border-border text-text-muted hover:bg-bg-sunken"
              }`}
            >
              {f === "Fulfilled" ? "PNA Fulfilled" : f}
            </button>
          ))}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search part, workorder, customer…"
            className="ml-2 w-56 rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text"
          />
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              type="button"
              className="btn-accent"
              onClick={() => {
                setPoResult(null);
                setPoModalOpen(true);
              }}
            >
              Raise Part Order ({selected.size})
            </button>
          )}
          <RecordCsvExportButton
            columns={["workorderId", "materialCode", "partName", "qty", "customerName", "customerPhone", "brandJobNo", "availability", "availableNow", "status", { key: "loggedDate", type: "date" }]}
            rows={exportRows}
            filename={`parts-not-available-${partnerId}-${new Date().toISOString().slice(0, 10)}.csv`}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted">
          {rows.length === 0 ? "No parts currently marked Not Available. Nice and clear." : "Nothing matches this filter."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" checked={allSelectableSelected} onChange={toggleAll} disabled={selectableIds.length === 0} />
                </th>
                <th className="px-3 py-2.5">Workorder</th>
                <th className="px-3 py-2.5">Material Code</th>
                <th className="px-3 py-2.5">Part Name</th>
                <th className="px-3 py-2.5 text-right">Qty Needed</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Brand Job No.</th>
                <th className="px-3 py-2.5">Availability</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Logged</th>
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2">
                    {r.status === "Open" && (
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/partner/${partnerId}/service-centre/${r.workorderId}`} className="font-medium text-accent hover:underline">
                      {r.workorderId}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.materialCode || r.materialId}</td>
                  <td className="px-3 py-2">{r.materialName || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.qty}</td>
                  <td className="px-3 py-2">
                    <div>{r.customerName || "—"}</div>
                    {r.customerPhone && <div className="text-xs text-text-muted">{r.customerPhone}</div>}
                  </td>
                  <td className="px-3 py-2">{r.brandJobNo || "—"}</td>
                  <td className="px-3 py-2">
                    {r.status === "Fulfilled" || r.status === "Closed (Workorder Closed)" ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      (() => {
                        const tag = availabilityTag(r);
                        return <StatusChip label={r.availableNow ? `${tag.label} — ${r.availableNow}` : tag.label} variant={tag.variant} />;
                      })()
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusChip label={displayStatus(r.status)} variant={statusVariant(r.status)} />
                  </td>
                  <td className="px-3 py-2 text-xs text-text-muted">{r.createdDate}</td>
                  <td className="px-2 py-2">
                    {(r.status === "Open" || r.status === "Ordered") && (
                      <button
                        type="button"
                        disabled={isPending}
                        className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
                        onClick={() => startTransition(() => resolvePnaEntryAction(partnerId, r.id))}
                      >
                        Mark Fulfilled
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={poModalOpen} onClose={() => setPoModalOpen(false)} title="Raise Part Order" size="sm">
        <p className="text-sm text-text-muted">
          Raises one Part Order per selected part ({selected.size} selected), Pending status — nothing is deducted
          from Stock until it's dispatched from Inventory.
        </p>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Source Warehouse
          <select
            value={poWarehouse}
            onChange={(e) => setPoWarehouse(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text"
          >
            <option value="">Choose a warehouse…</option>
            {warehouseOptions.map((w) => (
              <option key={w.value} value={w.label}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Destination Location
          <input
            type="text"
            value={poDestination}
            onChange={(e) => setPoDestination(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text"
          />
        </label>
        {poResult && <p className="mt-3 text-sm text-danger">{poResult}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={() => setPoModalOpen(false)} disabled={poSubmitting}>
            Cancel
          </button>
          <button type="button" className="btn-accent disabled:opacity-50" onClick={submitRaisePo} disabled={poSubmitting || !poWarehouse}>
            {poSubmitting ? "Raising…" : "Raise Part Order"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
