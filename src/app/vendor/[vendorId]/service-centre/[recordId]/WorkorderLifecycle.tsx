"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { SearchSelectModal, type SearchSelectOption } from "@/components/SearchSelectModal";
import {
  WORKORDER_STAGES,
  type WorkorderStage,
  type PartLine,
  type ServiceLine,
} from "@/lib/sample-data/service-centre";
import { getBomOptions, bomRows } from "@/lib/sample-data/bom";
import { getSolutionOptions } from "@/lib/sample-data/solutions";

const STAGE_VARIANT: Record<WorkorderStage, "neutral" | "warning" | "teal" | "success"> = {
  Created: "neutral",
  "In Progress": "warning",
  Completed: "teal",
  Closed: "success",
};

export function WorkorderLifecycle({
  vendorId,
  workorderId,
  initialStage,
  initialPartLines,
  initialServiceLines,
  brandName,
  modelName,
}: {
  vendorId: string;
  workorderId: string;
  initialStage: WorkorderStage;
  initialPartLines: PartLine[];
  initialServiceLines: ServiceLine[];
  brandName?: string;
  modelName?: string;
}) {
  const [stage, setStage] = useState<WorkorderStage>(initialStage);
  const [partLines, setPartLines] = useState<PartLine[]>(initialPartLines);
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>(initialServiceLines);
  const [partPickerOpen, setPartPickerOpen] = useState(false);
  const [solutionPickerOpen, setSolutionPickerOpen] = useState(false);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const [closeBlockedMessage, setCloseBlockedMessage] = useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState("");

  const bomOptions: SearchSelectOption[] = getBomOptions().map((o) => ({ value: o.value, label: o.label }));
  const solutionOptions: SearchSelectOption[] = getSolutionOptions().map((o) => ({ value: o.value, label: o.label }));

  const editable = stage === "In Progress";
  const unresolvedSerials = partLines.filter((p) => p.serialized && !p.serial && !p.pending);

  function addPart(option: SearchSelectOption) {
    const material = bomRows.find((r) => String(r["id"]) === option.value);
    setPartLines((prev) => [
      ...prev,
      {
        id: `PL-${Date.now()}`,
        materialId: option.value,
        materialLabel: option.label,
        qty: 1,
        serialized: Boolean(material?.["serialized"]),
      },
    ]);
    setPartPickerOpen(false);
  }

  function addSolution(option: SearchSelectOption) {
    setServiceLines((prev) => [
      ...prev,
      { id: `SL-${Date.now()}`, solutionId: option.value, solutionLabel: option.label, laborCharge: 0 },
    ]);
    setSolutionPickerOpen(false);
  }

  function markPending(lineId: string) {
    setPartLines((prev) => prev.map((p) => (p.id === lineId ? { ...p, pending: true, pendingReason: "Awaiting stock" } : p)));
    setPendingLineId(null);
  }

  function setSerial(lineId: string, serial: string) {
    setPartLines((prev) => prev.map((p) => (p.id === lineId ? { ...p, serial } : p)));
  }

  function advanceStage() {
    const idx = WORKORDER_STAGES.indexOf(stage);
    const next = WORKORDER_STAGES[idx + 1];
    if (!next) return;
    if (next === "Closed") {
      if (unresolvedSerials.length > 0) {
        setCloseBlockedMessage(
          `${unresolvedSerials.length} part line(s) are serialized but missing a Serial/IMEI number. Enter the serial or mark the line Pending before closing — this validates against warehouse stock.`
        );
        return;
      }
      setConfirmCloseOpen(true);
      return;
    }
    setStage(next);
  }

  function confirmClose() {
    setStage("Closed");
    setConfirmCloseOpen(false);
  }

  return (
    <div>
      {/* Stage stepper */}
      <div className="flex flex-wrap items-center gap-2">
        {WORKORDER_STAGES.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <StatusChip label={s} variant={s === stage ? STAGE_VARIANT[s] : "neutral"} />
            {i < WORKORDER_STAGES.length - 1 && <span className="text-text-muted">&rarr;</span>}
          </div>
        ))}
      </div>

      {(brandName || modelName) && (
        <p className="mt-2 text-sm text-text-muted">
          {brandName} {modelName}
        </p>
      )}

      {closeBlockedMessage && (
        <div className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {closeBlockedMessage}
        </div>
      )}

      {/* Parts & Service Lines */}
      <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-text">Parts & Service Lines</h2>
          {editable && (
            <div className="flex items-center gap-2">
              <button type="button" className="btn-outline" onClick={() => setSolutionPickerOpen(true)}>
                + Add Solution
              </button>
              <button type="button" className="btn-outline" onClick={() => setPartPickerOpen(true)}>
                + Add Part
              </button>
            </div>
          )}
        </div>

        {serviceLines.length === 0 && partLines.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No parts or service lines added yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {serviceLines.map((line) => (
              <div key={line.id} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm">
                <div>
                  <span className="font-semibold text-text">{line.solutionLabel}</span>
                  <span className="ml-2 text-xs text-text-muted">Solution</span>
                </div>
                <span className="tabular-nums text-text-muted">₹{line.laborCharge}</span>
              </div>
            ))}
            {partLines.map((line) => (
              <div key={line.id} className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-text">{line.materialLabel}</span>
                    <span className="ml-2 text-xs text-text-muted">Qty {line.qty}</span>
                    {line.serialized && <StatusChip label="Serialized" variant="amber" className="ml-2" />}
                    {line.pending && <StatusChip label="Pending" variant="warning" className="ml-2" />}
                  </div>
                  {editable && !line.pending && (
                    <button type="button" className="text-xs text-danger hover:underline" onClick={() => setPendingLineId(line.id)}>
                      Mark Pending
                    </button>
                  )}
                </div>
                {line.serialized && !line.pending && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Serial / IMEI number"
                      value={line.serial ?? ""}
                      disabled={!editable}
                      onChange={(e) => setSerial(line.id, e.target.value)}
                      className="w-full rounded-md border border-border bg-bg-raised px-2 py-1.5 text-sm text-text disabled:opacity-60"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Handover & Close, only surfaces after Completed */}
      {stage === "Completed" && (
        <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
          <h2 className="font-display text-base font-bold text-text">Handover & Close</h2>
          <textarea
            value={handoverNotes}
            onChange={(e) => setHandoverNotes(e.target.value)}
            placeholder="Handover notes (optional)"
            className="mt-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            rows={3}
          />
        </div>
      )}

      {/* Stage actions */}
      <div className="mt-6 flex items-center gap-3">
        {stage !== "Closed" && (
          <button type="button" className="btn-accent" onClick={advanceStage}>
            {stage === "Created" && "Start Progress"}
            {stage === "In Progress" && "Mark Completed"}
            {stage === "Completed" && "Handover & Close"}
          </button>
        )}
        <Link href={`/vendor/${vendorId}/service-centre/${workorderId}/document`} className="btn-outline">
          View Service Order
        </Link>
        {stage === "Closed" && (
          <Link href={`/vendor/${vendorId}/service-centre/${workorderId}/invoice`} className="btn-outline">
            Sales Invoice
          </Link>
        )}
      </div>

      <SearchSelectModal
        open={partPickerOpen}
        onClose={() => setPartPickerOpen(false)}
        title="Add Part"
        options={bomOptions}
        onSelect={addPart}
      />
      <SearchSelectModal
        open={solutionPickerOpen}
        onClose={() => setSolutionPickerOpen(false)}
        title="Add Solution"
        options={solutionOptions}
        onSelect={addSolution}
      />
      <Modal
        open={pendingLineId !== null}
        onClose={() => setPendingLineId(null)}
        title="Mark Part Pending"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setPendingLineId(null)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={() => pendingLineId && markPending(pendingLineId)}>
              Mark Pending
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          This part will be marked pending — a Return/Purchase Order can be raised from Inventory to fulfill it.
          Continue?
        </p>
      </Modal>
      <Modal
        open={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        title="Close Workorder"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setConfirmCloseOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={confirmClose}>
              Close Workorder
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          All serialized parts are accounted for. Close this workorder and hand it over to the customer?
        </p>
      </Modal>
    </div>
  );
}
