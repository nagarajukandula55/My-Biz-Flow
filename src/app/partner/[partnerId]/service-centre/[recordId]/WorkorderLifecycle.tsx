"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { SearchSelectModal, type SearchSelectOption } from "@/components/SearchSelectModal";
import {
  WORKORDER_STAGES,
  MILESTONE_STATUSES,
  PAYMENT_MODES,
  mapStageToMilestone,
  type WorkorderStage,
  type MilestoneStatus,
  type PartLine,
  type ServiceLine,
} from "@/lib/sample-data/service-centre";
import {
  setWorkorderHoldAction,
  createInvoiceFromWorkorderAction,
  cancelWorkorderAction,
  deductInventoryForWorkorderAction,
  patchServiceCentreWorkorderAction,
} from "./actions";

const STAGE_VARIANT: Record<WorkorderStage, "neutral" | "warning" | "teal" | "success"> = {
  Created: "neutral",
  "In Progress": "warning",
  Completed: "teal",
  Closed: "success",
};

/** Visual variant per milestone — CANCELLED excluded from the linear stepper (shown as a separate badge when it applies). */
const MILESTONE_VARIANT: Record<MilestoneStatus, "neutral" | "warning" | "teal" | "success" | "danger"> = {
  CREATED: "neutral",
  REPAIR_STARTED: "neutral",
  REPAIR_IN_PROGRESS: "warning",
  PART_PENDING: "danger",
  REPAIR_COMPLETED: "teal",
  CLOSED: "success",
  CANCELLED: "danger",
};

const MILESTONE_LABEL: Record<MilestoneStatus, string> = {
  CREATED: "Created",
  REPAIR_STARTED: "Repair Started",
  REPAIR_IN_PROGRESS: "Repair In Progress",
  PART_PENDING: "Part Pending",
  REPAIR_COMPLETED: "Repair Completed",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

/** Linear stepper order — CANCELLED is a terminal side-branch, not shown inline. */
const MILESTONE_STEPPER: MilestoneStatus[] = MILESTONE_STATUSES.filter((m) => m !== "CANCELLED");

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
  cancelledAt,
  cancelReason,
  bomMaterials,
  solutionOptions,
  brandOptions,
  modelOptions,
  technicianOptions,
  solutionLaborCharges,
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
  /** Set once the job has been cancelled (terminal — see cancelWorkorderAction). */
  cancelledAt?: string;
  cancelReason?: string;
  /**
   * This partner's own live BOM materials (Inventory > Material Catalog) —
   * not the global sample catalog. `rate`/`taxPercent` are the material's
   * real catalog price, stamped onto a part line at add time so the
   * persisted Billing invoice and the printed invoice document agree.
   */
  bomMaterials: { id: string; label: string; serialized: boolean; rate?: number; taxPercent?: number }[];
  /** This partner's own live Solutions catalog. `defaultLaborCharge` pre-fills a new service line's charge. */
  solutionOptions: SearchSelectOption[];
  /** Default labor charge per solution id, from the partner's Solutions catalog. */
  solutionLaborCharges: Record<string, number>;
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
  const [cancelled, setCancelled] = useState(Boolean(cancelledAt));
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReasonDraft, setCancelReasonDraft] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [paymentCollected, setPaymentCollected] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>(PAYMENT_MODES[0]);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [, startPersist] = useTransition();

  /**
   * Every mutation goes through here so a Server Action rejection (an
   * illegal stage transition, a missing record, an empty cancel reason)
   * surfaces in the UI rather than vanishing into an unhandled transition.
   */
  function run(fn: () => Promise<void>, onSuccess?: () => void) {
    setActionError(null);
    startPersist(async () => {
      try {
        await fn();
        onSuccess?.();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      }
    });
  }

  function persist(patch: Record<string, unknown>) {
    run(() => patchServiceCentreWorkorderAction(partnerId, workorderId, patch));
  }

  const bomOptions: SearchSelectOption[] = bomMaterials.map((m) => ({ value: m.id, label: m.label }));
  // Estimate covers labor AND parts — parts were previously excluded, so
  // the figure the customer approved never mentioned the biggest cost.
  const laborTotal = serviceLines.reduce((sum, l) => sum + (l.laborCharge || 0), 0);
  const partsTotal = partLines.reduce((sum, p) => (p.pending ? sum : sum + (p.unitPrice || 0) * (p.qty || 1)), 0);
  const estimateTotal = laborTotal + partsTotal;

  const editable = stage === "In Progress" && !hold && !cancelled;
  const terminal = cancelled || stage === "Closed";
  const unresolvedSerials = partLines.filter((p) => p.serialized && !p.serial && !p.pending);

  function addPart(option: SearchSelectOption) {
    const material = bomMaterials.find((m) => m.id === option.value);
    const next: PartLine[] = [
      ...partLines,
      {
        id: `PL-${Date.now()}`,
        materialId: option.value,
        materialLabel: option.label,
        qty: 1,
        serialized: Boolean(material?.serialized),
        // Stamped from the partner's own BOM catalog so the quantity the
        // operator sets below actually prices the line.
        unitPrice: material?.rate,
        taxRate: material?.taxPercent,
      },
    ];
    setPartLines(next);
    setPartPickerOpen(false);
    persist({ partLines: next });
  }

  /** Editable per-line quantity — was previously hardcoded to 1 with no input at all. */
  function setPartQty(lineId: string, rawQty: string) {
    const qty = Math.max(1, Math.floor(Number(rawQty) || 1));
    setPartLines((prev) => prev.map((p) => (p.id === lineId ? { ...p, qty } : p)));
  }

  function persistPartQty() {
    persist({ partLines });
  }

  function addSolution(option: SearchSelectOption) {
    // Pre-fill from the solution's own defaultLaborCharge (Solutions
    // catalog) — it was defined there all along but never read, so every
    // service line was added at ₹0 and silently under-billed the job.
    const next: ServiceLine[] = [
      ...serviceLines,
      {
        id: `SL-${Date.now()}`,
        solutionId: option.value,
        solutionLabel: option.label,
        laborCharge: solutionLaborCharges[option.value] ?? 0,
      },
    ];
    setServiceLines(next);
    setSolutionPickerOpen(false);
    persist({ serviceLines: next });
  }

  /** The pre-filled default is a starting point, not a lock — it stays editable. */
  function setLaborCharge(lineId: string, rawCharge: string) {
    const laborCharge = Math.max(0, Number(rawCharge) || 0);
    setServiceLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, laborCharge } : l)));
  }

  function persistLaborCharge() {
    persist({ serviceLines });
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
    run(() => setWorkorderHoldAction(partnerId, workorderId, next));
  }

  function createInvoice() {
    const amount = paymentAmount.trim() === "" ? undefined : Math.max(0, Number(paymentAmount) || 0);
    run(
      () =>
        createInvoiceFromWorkorderAction(partnerId, workorderId, {
          collected: paymentCollected,
          mode: paymentCollected ? paymentMode : undefined,
          amount: paymentCollected ? amount : undefined,
        }),
      () => {
        setInvoiceModalOpen(false);
        setInvoice("pending"); // optimistic; page revalidation fills in the real id on next load
      }
    );
  }

  function confirmCancel() {
    const reason = cancelReasonDraft.trim();
    if (!reason) {
      setActionError("A cancellation reason is required.");
      return;
    }
    run(
      () => cancelWorkorderAction(partnerId, workorderId, reason),
      () => {
        setCancelled(true);
        setHold(false);
        setCancelModalOpen(false);
      }
    );
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
    if (next === "Completed") {
      // Side effect, mirrors POS checkout: deduct consumed parts from live Inventory stock once the repair is done.
      startPersist(async () => {
        await deductInventoryForWorkorderAction(partnerId, workorderId);
      });
    }
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
      {/* Milestone stepper — 7-stage MilestoneStatus (mirrors AN-CRM's CrmJobSheet lifecycle),
          derived from the underlying 4-stage WorkorderStage + onHold via mapStageToMilestone()
          so existing records/persistence keep working unmodified (see service-centre.ts). */}
      {cancelled && (
        <div className="mb-3">
          <StatusChip label={`Cancelled${cancelReason ? ` — ${cancelReason}` : ""}`} variant="danger" />
        </div>
      )}
      {(() => {
        const currentMilestone = mapStageToMilestone(stage, hold, cancelled);
        const currentIdx = MILESTONE_STEPPER.indexOf(currentMilestone);
        return (
          <div className="flex flex-wrap items-center gap-2">
            {MILESTONE_STEPPER.map((m, i) => (
              <div key={m} className="flex items-center gap-2">
                <StatusChip label={MILESTONE_LABEL[m]} variant={i <= currentIdx ? MILESTONE_VARIANT[m] : "neutral"} />
                {i < MILESTONE_STEPPER.length - 1 && <span className="text-text-muted">&rarr;</span>}
              </div>
            ))}
          </div>
        );
      })()}

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

      {(closeBlockedMessage || actionError) && (
        <div className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {closeBlockedMessage ?? actionError}
        </div>
      )}

      {/* Estimate approval — gates entry into In Progress unless under warranty */}
      {stage === "Created" && !underWarranty && !cancelled && (
        <div className="mt-4 rounded-md border border-border bg-bg-raised p-4">
          <h2 className="font-display text-base font-bold text-text">Estimate</h2>
          <p className="mt-1 text-sm text-text-muted">
            Current estimate: <span className="font-semibold text-text">₹{estimateTotal}</span> — ₹{laborTotal} labor
            across {serviceLines.length} service line(s) plus ₹{partsTotal} in parts, priced from the Material Catalog.
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
      {stage === "In Progress" && !cancelled && (
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
              <div key={line.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg px-3 py-2 text-sm">
                <div>
                  <span className="font-semibold text-text">{line.solutionLabel}</span>
                  <span className="ml-2 text-xs text-text-muted">Solution</span>
                </div>
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
                  <span>Labor ₹</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={line.laborCharge}
                    disabled={!editable}
                    onChange={(e) => setLaborCharge(line.id, e.target.value)}
                    onBlur={persistLaborCharge}
                    className="w-24 rounded-md border border-border bg-bg-raised px-2 py-1 text-right text-sm tabular-nums text-text disabled:opacity-60"
                  />
                </label>
              </div>
            ))}
            {partLines.map((line) => (
              <div key={line.id} className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-text">{line.materialLabel}</span>
                    <label className="flex items-center gap-1.5 text-xs text-text-muted">
                      <span>Qty</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={line.qty}
                        disabled={!editable || line.pending}
                        onChange={(e) => setPartQty(line.id, e.target.value)}
                        onBlur={persistPartQty}
                        className="w-16 rounded-md border border-border bg-bg-raised px-2 py-1 text-right text-sm tabular-nums text-text disabled:opacity-60"
                      />
                    </label>
                    {typeof line.unitPrice === "number" && (
                      <span className="text-xs tabular-nums text-text-muted">
                        @ ₹{line.unitPrice} = ₹{line.unitPrice * (line.qty || 1)}
                      </span>
                    )}
                    {line.serialized && <StatusChip label="Serialized" variant="amber" />}
                    {line.pending && <StatusChip label="Pending" variant="warning" />}
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
      {stage === "Completed" && !cancelled && (
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
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!terminal && (
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
        {/* Cancel is available from any non-terminal stage — a job can be
            abandoned before, during, or after repair, but never once it's
            already Closed or Cancelled. */}
        {!terminal && (
          <button
            type="button"
            className="btn-outline text-danger"
            onClick={() => {
              setCancelReasonDraft("");
              setActionError(null);
              setCancelModalOpen(true);
            }}
          >
            Cancel Workorder
          </button>
        )}
        {stage === "Closed" && !cancelled && !invoice && (
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setPaymentCollected(!underWarranty);
              setPaymentAmount("");
              setActionError(null);
              if (underWarranty) {
                // Nothing to collect on a warranty job — skip the payment prompt.
                createInvoice();
              } else {
                setInvoiceModalOpen(true);
              }
            }}
          >
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
      {/* Cancellation — same Modal + confirm pattern as Mark Part Pending /
          Close Workorder above, with a mandatory reason. */}
      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Workorder"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCancelModalOpen(false)}>
              Keep Workorder
            </button>
            <button
              type="button"
              className="btn-accent disabled:opacity-50"
              onClick={confirmCancel}
              disabled={!cancelReasonDraft.trim()}
            >
              Cancel Workorder
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          This is permanent — a cancelled workorder can&apos;t be reopened or advanced. A reason is required.
        </p>
        <textarea
          value={cancelReasonDraft}
          onChange={(e) => setCancelReasonDraft(e.target.value)}
          placeholder="Why is this workorder being cancelled?"
          rows={3}
          className="mt-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </Modal>
      {/* Payment capture at handover — previously the invoice was always
          left in Draft with no amount or mode ever recorded. */}
      <Modal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        title="Create Invoice"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setInvoiceModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={createInvoice}>
              Create Invoice
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Chargeable lines total <span className="font-semibold text-text">₹{estimateTotal}</span> before GST. Record
          the payment now if the customer settled at handover — this marks the invoice Paid and files a matching
          entry under Billing &gt; Payments.
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={paymentCollected}
            onChange={(e) => setPaymentCollected(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Payment collected at handover
        </label>
        {paymentCollected && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Payment Mode
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-text"
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Amount Collected (₹)
              <input
                type="number"
                min={0}
                step={1}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Full invoice total"
                className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm font-normal normal-case tracking-normal tabular-nums text-text"
              />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
