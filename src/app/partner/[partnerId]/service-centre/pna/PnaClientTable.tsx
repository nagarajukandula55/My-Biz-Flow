"use client";

import { useTransition } from "react";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { resolvePnaEntryAction } from "./actions";

export type PnaRow = {
  id: string;
  workorderId: string;
  materialId: string;
  materialLabel: string;
  qty: number;
  customerName: string;
  customerPhone: string;
  brandJobNo: string;
  status: string;
  createdDate: string;
  /** Live Available Qty text (e.g. "Central Warehouse — Bengaluru: 12 avail") for this row's material, computed server-side from the real Stock ledger — empty when nothing's on hand anywhere yet. */
  availableNow: string;
};

/**
 * Owner/staff work queue for parts marked "Part Not Available" on a
 * workorder (see WorkorderLifecycle's PNA modal / createPnaEntryAction).
 * A plain custom table rather than the shared DataTable, since each row
 * needs a live-computed availability chip and a "Mark Fulfilled" action
 * button DataTable's column model doesn't cover.
 */
export function PnaClientTable({ partnerId, rows }: { partnerId: string; rows: PnaRow[] }) {
  const [isPending, startTransition] = useTransition();

  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">No parts currently marked Not Available. Nice and clear.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
            <th className="px-3 py-2.5">Workorder</th>
            <th className="px-3 py-2.5">Part</th>
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
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-b-0">
              <td className="px-3 py-2">
                <Link href={`/partner/${partnerId}/service-centre/${r.workorderId}`} className="font-medium text-accent hover:underline">
                  {r.workorderId}
                </Link>
              </td>
              <td className="px-3 py-2">{r.materialLabel || r.materialId}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.qty}</td>
              <td className="px-3 py-2">
                <div>{r.customerName || "—"}</div>
                {r.customerPhone && <div className="text-xs text-text-muted">{r.customerPhone}</div>}
              </td>
              <td className="px-3 py-2">{r.brandJobNo || "—"}</td>
              <td className="px-3 py-2">
                {r.status === "Fulfilled" ? (
                  <span className="text-text-muted">—</span>
                ) : r.availableNow ? (
                  <StatusChip label={`Available now: ${r.availableNow}`} variant="success" />
                ) : (
                  <StatusChip label="Still unavailable" variant="danger" />
                )}
              </td>
              <td className="px-3 py-2">
                <StatusChip label={r.status} variant={r.status === "Fulfilled" ? "success" : "warning"} />
              </td>
              <td className="px-3 py-2 text-xs text-text-muted">{r.createdDate}</td>
              <td className="px-2 py-2">
                {r.status !== "Fulfilled" && (
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
  );
}
