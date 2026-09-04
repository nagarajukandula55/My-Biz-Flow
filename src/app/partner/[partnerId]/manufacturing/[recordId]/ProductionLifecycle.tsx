"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { SearchSelectModal, type SearchSelectOption } from "@/components/SearchSelectModal";
import { PRODUCTION_STAGES, type ProductionStage, type BomLine } from "@/lib/sample-data/manufacturing";
import { patchBusinessRecordAction } from "@/lib/businessRecordActions";
import { completeProductionAction } from "../actions";

const STAGE_VARIANT: Record<ProductionStage, "neutral" | "warning" | "amber" | "teal" | "success"> = {
  Planned: "neutral",
  "Raw Material Issued": "amber",
  "In Production": "warning",
  QC: "teal",
  Completed: "success",
};

export function ProductionLifecycle({
  partnerId,
  workOrderId,
  initialStage,
  initialBomLines,
  quantityPlanned,
  bomMaterials,
}: {
  partnerId: string;
  workOrderId: string;
  initialStage: ProductionStage;
  initialBomLines: BomLine[];
  quantityPlanned?: number;
  /** This partner's own live BOM materials (Inventory > Material Catalog), including rate — needed for costing. */
  bomMaterials: { id: string; label: string; rate: number }[];
}) {
  const [stage, setStage] = useState<ProductionStage>(initialStage);
  const [bomLines, setBomLines] = useState<BomLine[]>(initialBomLines);
  const [partPickerOpen, setPartPickerOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [laborCostInput, setLaborCostInput] = useState("0");
  const [quantityProducedInput, setQuantityProducedInput] = useState(String(quantityPlanned ?? ""));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, startPersist] = useTransition();

  function persist(patch: Record<string, unknown>) {
    startPersist(async () => {
      await patchBusinessRecordAction(partnerId, "manufacturing", workOrderId, patch);
    });
  }

  const bomOptions: SearchSelectOption[] = bomMaterials.map((m) => ({ value: m.id, label: m.label }));
  const editable = stage !== "Completed";
  const estimatedMaterialCost = bomLines.reduce((sum, l) => sum + l.qty * l.rate, 0);

  function addBomLine(option: SearchSelectOption) {
    const material = bomMaterials.find((m) => m.id === option.value);
    const next: BomLine[] = [
      ...bomLines,
      {
        id: `BL-${Date.now()}`,
        materialId: option.value,
        materialLabel: option.label,
        qty: 1,
        rate: material?.rate ?? 0,
      },
    ];
    setBomLines(next);
    setPartPickerOpen(false);
    persist({ bomLines: next });
  }

  function setLineQty(lineId: string, qty: number) {
    setBomLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, qty } : l)));
  }

  function persistLineQty() {
    persist({ bomLines });
  }

  function removeLine(lineId: string) {
    const next = bomLines.filter((l) => l.id !== lineId);
    setBomLines(next);
    persist({ bomLines: next });
  }

  function advanceStage() {
    const idx = PRODUCTION_STAGES.indexOf(stage);
    const next = PRODUCTION_STAGES[idx + 1];
    if (!next) return;
    if (next === "Raw Material Issued" && bomLines.length === 0) {
      setErrorMessage("Add at least one BOM line before issuing raw materials.");
      return;
    }
    if (next === "Completed") {
      setCompleteModalOpen(true);
      return;
    }
    setErrorMessage(null);
    setStage(next);
    persist({ stage: next });
  }

  function submitComplete() {
    const laborCost = Number(laborCostInput) || 0;
    const quantityProduced = Number(quantityProducedInput) || 0;
    startPersist(async () => {
      const result = await completeProductionAction(partnerId, workOrderId, laborCost, quantityProduced);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setErrorMessage(null);
      setCompleteModalOpen(false);
      setStage("Completed");
    });
  }

  return (
    <div>
      {/* Stage stepper */}
      <div className="flex flex-wrap items-center gap-2">
        {PRODUCTION_STAGES.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <StatusChip label={s} variant={s === stage ? STAGE_VARIANT[s] : "neutral"} />
            {i < PRODUCTION_STAGES.length - 1 && <span className="text-text-muted">&rarr;</span>}
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      {/* BOM lines */}
      <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-text">Bill of Materials</h2>
          {editable && (
            <button type="button" className="btn-outline" onClick={() => setPartPickerOpen(true)}>
              + Add BOM Line
            </button>
          )}
        </div>

        {bomLines.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No raw materials added yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {bomLines.map((line) => (
              <div key={line.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg px-3 py-2 text-sm">
                <div className="flex-1">
                  <span className="font-semibold text-text">{line.materialLabel}</span>
                  <span className="ml-2 text-xs text-text-muted">₹{line.rate}/unit</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={line.qty}
                  disabled={!editable}
                  onChange={(e) => setLineQty(line.id, Number(e.target.value) || 0)}
                  onBlur={persistLineQty}
                  className="w-24 rounded-md border border-border bg-bg-raised px-2 py-1.5 text-sm text-text disabled:opacity-60"
                />
                <span className="w-24 text-right tabular-nums text-text-muted">₹{Math.round(line.qty * line.rate)}</span>
                {editable && (
                  <button type="button" className="text-xs text-danger hover:underline" onClick={() => removeLine(line.id)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-end gap-2 pt-1 text-sm">
              <span className="text-text-muted">Estimated material cost:</span>
              <span className="font-semibold text-text">₹{Math.round(estimatedMaterialCost)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Completed cost summary */}
      {stage === "Completed" && (
        <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
          <h2 className="font-display text-base font-bold text-text">Production Cost</h2>
          <p className="mt-2 text-sm text-text-muted">
            Material cost + labor cost = total production cost, computed on Complete Production and stored on this
            work order.
          </p>
        </div>
      )}

      {/* Stage actions */}
      <div className="mt-6 flex items-center gap-3">
        {stage !== "Completed" && (
          <button type="button" className="btn-accent" onClick={advanceStage}>
            {stage === "Planned" && "Issue Raw Materials"}
            {stage === "Raw Material Issued" && "Start Production"}
            {stage === "In Production" && "Send to QC"}
            {stage === "QC" && "Complete Production"}
          </button>
        )}
      </div>

      <SearchSelectModal
        open={partPickerOpen}
        onClose={() => setPartPickerOpen(false)}
        title="Add BOM Line"
        options={bomOptions}
        onSelect={addBomLine}
      />

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
