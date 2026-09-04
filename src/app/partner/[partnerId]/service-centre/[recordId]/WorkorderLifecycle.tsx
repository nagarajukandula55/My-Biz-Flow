"use client";

import { useState, useTransition } from "react";
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
import { patchBusinessRecordAction } from "@/lib/businessRecordActions";
import { setWorkorderHoldAction, createInvoiceFromWorkorderAction } from "./actions";

const STAGE_VARIANT: Record<WorkorderStage, "neutral" | "warning" | "teal" | "success"> = {
  Created: "neutral",
  "In Progress": "warning",
  Completed: "teal",
  Closed: "success",
};

export function WorkorderLifecycle({
  partnerId,
  workorderId,
  initialStage,
  initialPartLines,
  initialServiceLines,
  initialHandoverNotes,
  brandId,
  brandName,
  modelId,
  modelName,
  technicianId,
  technicianName,
  onHold,
  holdReason,
  estimateApproved,
  underWarranty,
  invoiceId,
  bomMaterials,
  solutionOptions,
  brandOptions,
  modelOptions,
  technicianOptions,
}: {
  partnerId: string;
  workorderId: string;
  initialStage: WorkorderStage;
  initialPartLines: PartLine[];
  initialServiceLines: ServiceLine[];
  initialHandoverNotes?: string;
  brandId?: string;
  brandName?: string;
  modelId?: string;
  modelName?: string;
  technicianId?: string;
  technicianName?: string;
  onHold?: boolean;
  holdReason?: string;
  estimateApproved?: boolean;
  underWarranty: boolean;
  invoiceId?: string;
  /** This partner's own live BOM materials (Inventory > Material Catalog) — not the global sample catalog. */
  bomMaterials: { id: string; label: string; serialized: boolean }[];
  /** This partner's own live Solutions catalog. */
  solutionOptions: SearchSelectOption[];
  /** This partner's own live Device Brands catalog. */
  brandOptions: SearchSelectOption[];
  /** This partner's own live Device Models catalog — labeled with brand for clarity since it isn't pre-filtered by the currently selected brand (that selection can change client-side after this prop was computed). */
  modelOptions: SearchSelectOption[];
  /** This partner's own active team members (Users) eligible for assignment. */
  technicianOptions: SearchSelectOption[];
}) {
  const [stage, setStage] = useState<WorkorderStage>(initialStage);
  const [partLines, setPartLines] = useState<PartLine[]>(initialPartLines);
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>(initialServiceLines);
  const [partPickerOpen, setPartPickerOpen] = useState(false);
  const [solutionPickerOpen, setSolutionPickerOpen] = useState(false);
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [technicianPickerOpen, setTechnicianPickerOpen] = useState(false);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const [closeBlockedMessage, setCloseBlockedMessage] = useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState(initialHandoverNotes ?? "");
  const [brand, setBrand] = useState({ id: brandId, name: brandName });
  const [model, setModel] = useState({ id: modelId, name: modelName });
  const [technician, setTechnician] = useState({ id: technicianId, name: technicianName });
  const [hold, setHold] = useState(Boolean(onHold));
  const [approved, setApproved] = useState(Boolean(estimateApproved) || underWarranty);
  const [invoice, setInvoice] = useState(invoiceId);
  const [, startPersist] = useTransition();

  function persist(patch: Record<string, unknown>) {
    startPersist(async () => {
      await patchBusinessRecordAction(partnerId, "service-centre", workorderId, patch);
    });
  }

  const bomOptions: SearchSelectOption[] = bomMaterials.map((m) => ({ value: m.id, label: m.label }));
  const estimateTotal = serviceLines.reduce((sum, l) => sum + (l.laborCharge || 0), 0);

  const editable = stage === "In Progress" && !hold;
  const unresolvedSerials = partLines.filter((p) => p.serialized && !p.serial && !p.pending);

  function addPart(option: SearchSelectOption) {
    const material = bomMaterials.find((m) => m.id === option.value);
    const next = [
      ...partLines,
      {
        id: `PL-${Date.now()}`,
        materialId: option.value,
        materialLabel: option.label,
        qty: 1,
        serialized: Boolean(material?.serialized),
      },
    ];
    setPartLines(next);
    setPartPickerOpen(false);
    persist({ partLines: next });
  }

  function addSolution(option: SearchSelectOption) {
    const next = [
      ...serviceLines,
      { id: `SL-${Date.now()}`, solutionId: option.value, solutionLabel: option.label, laborCharge: 0 },
    ];
    setServiceLines(next);
    setSolutionPickerOpen(false);
    persist({ serviceLines: next });
  }

  function markPending(lineId: string) {
    const next = partLines.map((p) => (p.id === lineId ? { ...p, pending: true, pendingReason: "Awaiting stock" } : p));
    setPartLines(next);
    setPendingLineId(null);
    persist({ partLines: next });
  }

  function setSerial(lineId: string, serial: string) {
    setPartLines((prev) => prev.map((p) => (p.id === lineId ? { ...p, serial } : p)));
  }

  function persistSerial(lineId: string) {
    const line = partLines.find((p) => p.id === lineId);
    if (line) persist({ partLines: partLines.map((p) => (p.id === lineId ? { ...p, serial: line.serial } : p)) });
  }

  function selectBrand(option: SearchSelectOption) {
    setBrand({ id: option.value, name: option.label });
    setModel({ id: undefined, name: undefined });
    setBrandPickerOpen(false);
    persist({ brandId: option.value, brandName: option.label, modelId: undefined, modelName: undefined });
  }

  function selectModel(option: SearchSelectOption) {
    setModel({ id: option.value, name: option.label });
    setModelPickerOpen(false);
    persist({ modelId: option.value, modelName: option.label });
  }

  function selectTechnician(option: SearchSelectOption) {
    const assignedAt = new Date().toISOString();
    setTechnician({ id: option.value, name: option.label });
    setTechnicianPickerOpen(false);
    persist({ technicianId: option.value, technicianName: option.label, assignedAt });
  }

  function toggleHold() {
    const next = !hold;
    setHold(next);
    startPersist(async () => {
      await setWorkorderHoldAction(partnerId, workorderId, next);
    });
  }

  function createInvoice() {
    startPersist(async () => {
      await createInvoiceFromWorkorderAction(partnerId, workorderId);
      setInvoice("pending"); // optimistic; page revalidation will fill in the real id on next load
    });
  }

  function approveEstimate() {
    setApproved(true);
    setCloseBlockedMessage(null);
    persist({ estimateApproved: true });
  }

  function advanceStage() {
    const idx = WORKORDER_STAGES.indexOf(stage);
    const next = WORKORDER_STAGES[idx + 1];
    if (!next) return;
    if (next === "In Progress" && !approved) {
      setCloseBlockedMessage(
        "The customer must approve the estimate before repair work starts (skipped automatically for in-warranty jobs)."
      );
      return;
    }
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
    persist({ stage: next });
  }

  function confirmClose() {
    setStage("Closed");
    setConfirmCloseOpen(false);
    persist({ stage: "Closed", handoverNotes });
  }

  function persistHandoverNotes() {
    persist({ handoverNotes });
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

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
        {underWarranty && <StatusChip label="Under Warranty — non-chargeable" variant="teal" />}
        {hold && <StatusChip label={`On Hold${holdReason ? ` — ${holdReason}` : ""}`} variant="danger" />}
      </div>

      {/* Device & Assignment */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setBrandPickerOpen(true)}
          className="rounded-md border border-border bg-bg-raised px-3 py-2 text-left text-sm"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Brand</div>
          <div className="mt-0.5 text-text">{brand.name ?? "Select brand"}</div>
        </button>
        <button
          type="button"
          onClick={() => brand.id && setModelPickerOpen(true)}
          disabled={!brand.id}
          className="rounded-md border border-border bg-bg-raised px-3 py-2 text-left text-sm disabled:opacity-50"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Model</div>
          <div className="mt-0.5 text-text">{model.name ?? (brand.id ? "Select model" : "Pick a brand first")}</div>
        </button>
        <button
          type="button"
          onClick={() => setTechnicianPickerOpen(true)}
          className="rounded-md border border-border bg-bg-raised px-3 py-2 text-left text-sm"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Assigned Technician</div>
          <div className="mt-0.5 text-text">{technician.name ?? "Unassigned"}</div>
        </button>
      </div>

      {closeBlockedMessage && (
        <div className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {closeBlockedMessage}
        </div>
      )}

      {/* Estimate approval — gates entry into In Progress unless under warranty */}
      {stage === "Created" && !underWarranty && (
        <div className="mt-4 rounded-md border border-border bg-bg-raised p-4">
          <h2 className="font-display text-base font-bold text-text">Estimate</h2>
          <p className="mt-1 text-sm text-text-muted">
            Current estimate: <span className="font-semibold text-text">₹{estimateTotal}</span> (labor only,
            from service lines added below — parts priced separately in Inventory).
          </p>
          {approved ? (
            <StatusChip label="Approved by customer" variant="success" className="mt-2" />
          ) : (
            <button type="button" className="btn-accent mt-2" onClick={approveEstimate}>
              Mark Estimate Approved
            </button>
          )}
        </div>
      )}

      {/* Hold (Parts Pending) — a side-state, not a stage; pauses editing without cancelling the job */}
      {stage === "In Progress" && (
        <div className="mt-4">
          <button type="button" className="btn-outline text-xs" onClick={toggleHold}>
            {hold ? "Resume from Hold" : "Put On Hold (awaiting parts)"}
          </button>
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
                      onBlur={() => persistSerial(line.id)}
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
            onBlur={persistHandoverNotes}
            placeholder="Handover notes (optional)"
            className="mt-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            rows={3}
          />
        </div>
      )}

      {/* Stage actions */}
      <div className="mt-6 flex items-center gap-3">
        {stage !== "Closed" && (
          <button
            type="button"
            className="btn-accent disabled:opacity-50"
            onClick={advanceStage}
            disabled={stage === "In Progress" && hold}
          >
            {stage === "Created" && "Start Progress"}
            {stage === "In Progress" && "Mark Completed"}
            {stage === "Completed" && "Handover & Close"}
          </button>
        )}
        <Link href={`/partner/${partnerId}/service-centre/${workorderId}/document`} className="btn-outline">
          View Service Order
        </Link>
        {stage === "Closed" && !invoice && (
          <button type="button" className="btn-outline" onClick={createInvoice}>
            Create Invoice{underWarranty ? " (Warranty — ₹0)" : ""}
          </button>
        )}
        {stage === "Closed" && invoice && (
          <Link href={`/partner/${partnerId}/service-centre/${workorderId}/invoice`} className="btn-outline">
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
        open={brandPickerOpen}
        onClose={() => setBrandPickerOpen(false)}
        title="Select Brand"
        options={brandOptions}
        onSelect={selectBrand}
      />
      <SearchSelectModal
        open={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
        title="Select Model"
        options={modelOptions}
        onSelect={selectModel}
      />
      <SearchSelectModal
        open={technicianPickerOpen}
        onClose={() => setTechnicianPickerOpen(false)}
        title="Assign Technician"
        options={technicianOptions}
        onSelect={selectTechnician}
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
