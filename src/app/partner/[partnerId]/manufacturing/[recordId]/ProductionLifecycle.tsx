"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { completeProductionAction, setProductionOrderStatusAction } from "../actions";
import { PRODUCTION_ORDER_STATUSES, type ProductionOrderStatus } from "@/lib/manufacturing";

const STAGE_ORDER: ProductionOrderStatus[] = ["Planned", "InProduction", "QC", "Completed"];

const STAGE_VARIANT: Record<ProductionOrderStatus, "neutral" | "warning" | "amber" | "teal" | "success" | "danger"> = {
  Planned: "neutral",
  InProduction: "warning",
  QC: "amber",
  Completed: "success",
  Delayed: "danger",
};

const STAGE_LABEL: Record<ProductionOrderStatus, string> = {
  Planned: "Planned",
  InProduction: "In Production",
  QC: "QC",
  Completed: "Completed",
  Delayed: "Delayed",
};

export function ProductionLifecycle({
  partnerId,
  orderId,
  initialStatus,
  bomLines,
  quantityPlanned,
  hasBom,
}: {
  partnerId: string;
  orderId: string;
  initialStatus: string;
  bomLines: { id: string; materialLabel: string; quantity: number; unitCost: number }[];
  quantityPlanned: number;
  hasBom: boolean;
}) {
  const [status, setStatus] = useState<ProductionOrderStatus>((initialStatus as ProductionOrderStatus) ?? "Planned");
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [laborCostInput, setLaborCostInput] = useState("0");
  const [quantityProducedInput, setQuantityProducedInput] = useState(String(quantityPlanned || ""));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, startTransitionState] = useTransition();

  const editable = status !== "Completed";
  const estimatedMaterialCost = bomLines.reduce((sum, l) => sum + l.quantity * (l.unitCost / 100), 0);

  function setNewStatus(next: ProductionOrderStatus) {
    if (next === "Completed") {
      if (!hasBom || bomLines.length === 0) {
        setErrorMessage("Link a Bill of Materials with at least one line before completing production.");
        return;
      }
      setCompleteModalOpen(true);
      return;
    }
    setErrorMessage(null);
    startTransitionState(async () => {
      const result = await setProductionOrderStatusAction(partnerId, orderId, next);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setStatus(next);
    });
  }

  function advanceStage() {
    const idx = STAGE_ORDER.indexOf(status === "Delayed" ? "Planned" : status);
    const next = STAGE_ORDER[idx + 1];
    if (!next) return;
    setNewStatus(next);
  }

  function submitComplete() {
    const laborCost = Number(laborCostInput) || 0;
    const quantityProduced = Number(quantityProducedInput) || 0;
    startTransitionState(async () => {
      const result = await completeProductionAction(partnerId, orderId, laborCost, quantityProduced);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setErrorMessage(null);
      setCompleteModalOpen(false);
      setStatus("Completed");
    });
  }

  return (
    <div>
      {/* Stage stepper */}
      <div className="flex flex-wrap items-center gap-2">
        {PRODUCTION_ORDER_STATUSES.filter((s) => s !== "Delayed").map((s, i, arr) => (
          <div key={s} className="flex items-center gap-2">
            <StatusChip label={STAGE_LABEL[s]} variant={s === status ? STAGE_VARIANT[s] : "neutral"} />
            {i < arr.length - 1 && <span className="text-text-muted">&rarr;</span>}
          </div>
        ))}
        {status === "Delayed" && (
          <>
            <span className="text-text-muted">·</span>
            <StatusChip label="Delayed" variant="danger" />
          </>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      {/* BOM lines (read-only — set by the linked BillOfMaterial, see Manufacturing > BOM) */}
      <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">Bill of Materials</h2>
        {!hasBom ? (
          <p className="mt-3 text-sm text-text-muted">No Bill of Materials linked to this production order.</p>
        ) : bomLines.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">The linked BOM has no lines.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {bomLines.map((line) => (
              <div key={line.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg px-3 py-2 text-sm">
                <div className="flex-1">
                  <span className="font-semibold text-text">{line.materialLabel}</span>
                  <span className="ml-2 text-xs text-text-muted">₹{(line.unitCost / 100).toFixed(2)}/unit</span>
                </div>
                <span className="w-24 text-right tabular-nums text-text-muted">Qty {line.quantity}</span>
                <span className="w-24 text-right tabular-nums text-text-muted">₹{Math.round(line.quantity * (line.unitCost / 100))}</span>
              </div>
            ))}
            <div className="flex items-center justify-end gap-2 pt-1 text-sm">
              <span className="text-text-muted">Estimated material cost:</span>
              <span className="font-semibold text-text">₹{Math.round(estimatedMaterialCost)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stage actions */}
      <div className="mt-6 flex items-center gap-3">
        {editable && status !== "Delayed" && (
          <button type="button" className="btn-accent" onClick={advanceStage}>
            {status === "Planned" && "Start Production"}
            {status === "InProduction" && "Send to QC"}
            {status === "QC" && "Complete Production"}
          </button>
        )}
        {editable && (
          <button type="button" className="btn-outline text-danger" onClick={() => setNewStatus("Delayed")}>
            Mark Delayed
          </button>
        )}
        {status === "Delayed" && (
          <button type="button" className="btn-accent" onClick={() => setNewStatus("Planned")}>
            Resume (back to Planned)
          </button>
        )}
      </div>

      <Modal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Complete Production"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCompleteModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={submitComplete}>
              Complete Production
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Deducts every BOM line's quantity from live Inventory stock (blocked if any line has insufficient stock —
            no partial deduction) and, if a quantity produced is entered, adds the finished good to Inventory stock.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Quantity Produced
            </label>
            <input
              type="number"
              min={0}
              value={quantityProducedInput}
              onChange={(e) => setQuantityProducedInput(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Labor Cost
            </label>
            <input
              type="number"
              min={0}
              value={laborCostInput}
              onChange={(e) => setLaborCostInput(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
