"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { openPrintPopup } from "@/lib/openPrintPopup";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { PrintPopupLink } from "@/components/PrintPopupLink";
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
  type StageHistoryEntry,
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

/**
 * Linear stepper order — matches AN-CRM's real 4-step MilestoneStepper
 * (CREATED / REPAIR_IN_PROGRESS / REPAIR_COMPLETED / CLOSED) exactly.
 * REPAIR_STARTED and PART_PENDING are real MilestoneStatus values (used by
 * mapStageToMilestone/getServiceCentreTimeline) but are NOT separate steps
 * in the reference app's stepper: REPAIR_STARTED collapses into the same
 * "In Progress" step, and PART_PENDING renders as a side Badge next to the
 * stepper instead (see the `hold` StatusChip below) — showing them as extra
 * steps was exactly the "looks different from AN-CRM" layout drift.
 * CANCELLED is a terminal side-branch, not shown inline either.
 */
const MILESTONE_STEPPER: MilestoneStatus[] = ["CREATED", "REPAIR_IN_PROGRESS", "REPAIR_COMPLETED", "CLOSED"];

function fmtStepDate(d?: string): string | null {
  if (!d) return null;
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** First stageHistory timestamp recorded for a given milestone's underlying WorkorderStage, mirroring AN-CRM's per-step stepDates (repairInProgressAt/completedAt/handedOverAt). */
function stepDateFor(milestone: MilestoneStatus, history: StageHistoryEntry[], createdAt?: string): string | undefined {
  const stageForMilestone: Partial<Record<MilestoneStatus, WorkorderStage>> = {
    REPAIR_IN_PROGRESS: "In Progress",
    REPAIR_COMPLETED: "Completed",
    CLOSED: "Closed",
  };
  if (milestone === "CREATED") return createdAt;
  const wantedStage = stageForMilestone[milestone];
  const hit = history.find((h) => h.stage === wantedStage);
  return hit?.at;
}

/** Elapsed hours between intake and now (or the Closed timestamp once closed), matching AN-CRM's running "TAT: Xh" badge. */
function formatTat(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

export function WorkorderLifecycle({
  partnerId,
  workorderId,
  recordLabel,
  customerName,
  customerPhone,
  imeiOrSerialNumber,
  faultDescription,
  loggedBy,
  remark,
  engineerRemark,
  initialStage,
  initialPartLines,
  initialServiceLines,
  initialHandoverNotes,
  brandId,
  brandName,
  modelId,
  modelName,
  engineerName,
  collectedByName,
  onHold,
  holdReason,
  brandJobNoForPartOrder,
  estimateApproved,
  underWarranty,
  invoiceId,
  cancelledAt,
  cancelReason,
  stageHistory,
  receivedDate,
  recordCreatedAt,
  bomMaterials,
  solutionOptions,
  brandOptions,
  modelOptions,
  staffNameOptions,
  solutionLaborCharges,
  addBrandAction,
  addModelAction,
}: {
  partnerId: string;
  workorderId: string;
  /** Display label for this workorder — the WO number shown as the page's title (e.g. "WO-26-27-0001"). */
  recordLabel: string;
  customerName?: string;
  customerPhone?: string;
  imeiOrSerialNumber?: string;
  faultDescription?: string;
  loggedBy?: string;
  /** Free-text "Remark" already carried on the workorder record (serviceCentreColumns' `remark`) — previously only shown, read-only, in the generic "More details" field grid. Now surfaced (and editable) on the Engineer Remark & Solution card, matching AN-CRM's own job-sheet layout. */
  remark?: string;
  /**
   * Distinct from `remark` above — AN-CRM's job-sheet has both an
   * "Engineer Remark" field and a separate "Remark" field on the same
   * card. No existing column/lifecycle slot carried this, so it's a new
   * top-level record field (`engineerRemark`), persisted the same generic
   * way `remark`/`handoverNotes` already are via patchServiceCentreWorkorderAction
   * — BusinessRecord's data is an untyped JSON blob, so this needs no
   * schema/model change, just a prop threaded through from the record.
   */
  engineerRemark?: string;
  initialStage: WorkorderStage;
  initialPartLines: PartLine[];
  initialServiceLines: ServiceLine[];
  initialHandoverNotes?: string;
  brandId?: string;
  brandName?: string;
  modelId?: string;
  modelName?: string;
  engineerName?: string;
  collectedByName?: string;
  onHold?: boolean;
  holdReason?: string;
  /**
   * The brand's/supplier's own reference for the part order raised while
   * this job waits on stock — the reference app captures the same thing
   * (brandJobNoForPartOrder) when a job is marked Part Pending, and it's
   * the only way to chase the order afterwards.
   */
  brandJobNoForPartOrder?: string;
  estimateApproved?: boolean;
  underWarranty: boolean;
  invoiceId?: string;
  /** Set once the job has been cancelled (terminal — see cancelWorkorderAction). */
  cancelledAt?: string;
  cancelReason?: string;
  /** Real stage transitions, used to show a per-milestone date on the stepper (mirrors AN-CRM's stepDates) — same source of truth the Activity Timeline reads via getServiceCentreTimeline. */
  stageHistory?: StageHistoryEntry[];
  /** Intake timestamp — the CREATED milestone's date. */
  receivedDate?: string;
  /**
   * The record's real, full-precision creation timestamp (DB `createdAt`,
   * exposed by businessRecords.ts's toRow() as `recordCreatedAt`) — used
   * for the CREATED milestone date and as TAT's start instead of
   * `receivedDate` above, which is a plain date-only field with no
   * time-of-day component (mirrors AN-CRM's own TAT, which runs from the
   * job sheet's real `createdAt`, not a user-entered date).
   */
  recordCreatedAt?: string;
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
  /**
   * Active names from this partner's Staff Names roster, offered as
   * suggestions on the two mandatory handover name fields. Empty on Starter
   * (the roster page is Pro), in which case both fields are plain free text
   * — deliberately, not as a fallback failure.
   */
  staffNameOptions: string[];
  /**
   * Bound, tier-checked server actions for quick-adding a Brand/Model right
   * from this repair page — omitted entirely (not just disabled) on a
   * partner below the tier that allows it, so a Starter shop never sees
   * the button at all. Mirrors the same "+ Add new" affordance already on
   * the New Workorder form (serviceCentreCreateFields.ts), just reachable
   * post-intake too, since a workorder's brand/model is often only
   * confirmed once the device is actually opened up.
   */
  addBrandAction?: (values: Record<string, unknown>) => Promise<{ error?: string; id?: string; label?: string }>;
  addModelAction?: (values: Record<string, unknown>) => Promise<{ error?: string; id?: string; label?: string }>;
}) {
  const [stage, setStage] = useState<WorkorderStage>(initialStage);
  const [partLines, setPartLines] = useState<PartLine[]>(initialPartLines);
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>(initialServiceLines);
  const [partPickerOpen, setPartPickerOpen] = useState(false);
  const [solutionPickerOpen, setSolutionPickerOpen] = useState(false);
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  // Seeded from the server-computed props, then appended to locally the
  // moment a quick-add succeeds — so the just-created brand/model is
  // immediately selectable in the SAME picker session without a refetch.
  const [brandOptionsState, setBrandOptionsState] = useState(brandOptions);
  const [modelOptionsState, setModelOptionsState] = useState(modelOptions);
  const [addBrandOpen, setAddBrandOpen] = useState(false);
  const [addModelOpen, setAddModelOpen] = useState(false);
  const [newCatalogName, setNewCatalogName] = useState("");
  const [addCatalogError, setAddCatalogError] = useState<string | null>(null);
  const [addCatalogPending, setAddCatalogPending] = useState(false);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const [closeBlockedMessage, setCloseBlockedMessage] = useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState(initialHandoverNotes ?? "");
  const [remarkText, setRemarkText] = useState(remark ?? "");
  const [engineerRemarkText, setEngineerRemarkText] = useState(engineerRemark ?? "");
  // Which Solution the "Solution" dropdown on the Engineer Remark & Solution
  // card currently has picked — separate from the modal-driven "+ Add
  // Service/Labour Charge" picker above, but both ultimately call the same
  // addSolution() mutation below.
  const [solutionSelectValue, setSolutionSelectValue] = useState("");
  // Tax Apply — on by default (matching AN-CRM), forced off for an
  // in-warranty job (already non-chargeable throughout), otherwise a plain
  // UI toggle over the same live tax preview the totals footer already
  // computed from partLines/serviceLines.
  const [taxApply, setTaxApply] = useState(!underWarranty);
  const [brand, setBrand] = useState({ id: brandId, name: brandName });
  const [model, setModel] = useState({ id: modelId, name: modelName });
  // Both start from whatever is already stored and are otherwise BLANK —
  // never prefilled from a previous job, a session user, or "last used".
  // They are the record of who actually did the work and who handed the
  // unit over, and a guessed answer to that is worse than no answer.
  const [engineer, setEngineer] = useState(engineerName ?? "");
  const [collectedBy, setCollectedBy] = useState(collectedByName ?? "");
  const [hold, setHold] = useState(Boolean(onHold));
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdReasonDraft, setHoldReasonDraft] = useState("");
  const [brandJobNoDraft, setBrandJobNoDraft] = useState(brandJobNoForPartOrder ?? "");
  const [brandJobNo, setBrandJobNo] = useState(brandJobNoForPartOrder ?? "");
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
  // Every stage transition here is a client-side startTransition + patch —
  // there's no redirect to land a ?created=1-style banner on, so a real
  // "Marked In Progress" / "Closed" / "Cancelled" acknowledgment has to be
  // inline state instead, set on success and auto-cleared like actionError
  // already is on failure.
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [, startPersist] = useTransition();
  // Ticks once a minute so the running TAT badge advances without a page
  // reload, matching AN-CRM's "TAT: 47.7h (running)" badge — frozen once
  // the job is Closed/Cancelled (closedAt below stops changing then).
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (stage === "Closed" || cancelledAt) return;
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [stage, cancelledAt]);

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

  function persist(patch: Record<string, unknown>, successLabel?: string) {
    run(
      () => patchServiceCentreWorkorderAction(partnerId, workorderId, patch),
      successLabel ? () => announceSuccess(successLabel) : undefined
    );
  }

  /** Shows a dismissible success banner for ~4s, matching SuccessBanner's own auto-fade. */
  function announceSuccess(label: string) {
    setSuccessMessage(label);
    setTimeout(() => setSuccessMessage((current) => (current === label ? null : current)), 4000);
  }

  const bomOptions: SearchSelectOption[] = bomMaterials.map((m) => ({ value: m.id, label: m.label }));
  // Estimate covers labor AND parts — parts were previously excluded, so
  // the figure the customer approved never mentioned the biggest cost.
  const laborTotal = serviceLines.reduce((sum, l) => sum + (l.laborCharge || 0), 0);
  const partsTotal = partLines.reduce((sum, p) => (p.pending ? sum : sum + (p.unitPrice || 0) * (p.qty || 1)), 0);
  const estimateTotal = laborTotal + partsTotal;
  /**
   * Live tax preview over the same lines, mirroring the reference app's
   * Parts & Service Lines footer — previously the operator could see a bare
   * labour/parts figure but never what the customer would actually be asked
   * to pay, which is the taxed total. Labour is SAC 9987 @ 18%, parts use
   * each line's own stamped slab — the same rates buildServiceCentreLines()
   * puts on the Estimate and the Sales Invoice, so the three agree.
   *
   * Split CGST/SGST here assumes intra-state supply, the common case and the
   * same assumption the reference app's live preview makes; the printed
   * invoice is where place of supply is resolved for real (a customer in
   * another state is taxed IGST at the full slab instead).
   */
  const laborTax = laborTotal * 0.18;
  const partsTax = partLines.reduce(
    (sum, p) => (p.pending ? sum : sum + (p.unitPrice || 0) * (p.qty || 1) * ((p.taxRate ?? 18) / 100)),
    0
  );
  const taxTotal = underWarranty || !taxApply ? 0 : laborTax + partsTax;
  const chargeableSubtotal = underWarranty ? 0 : estimateTotal;
  const inr = (value: number) =>
    value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const editable = stage === "In Progress" && !hold && !cancelled;
  const terminal = cancelled || stage === "Closed";
  const unresolvedSerials = partLines.filter((p) => p.serialized && !p.serial && !p.pending);

  // TAT — elapsed time since intake, running until Closed/Cancelled (then
  // frozen at the terminal timestamp), mirroring AN-CRM's "TAT: 47.7h
  // (running)" badge next to the stepper.
  const closedHistoryEntry = (stageHistory ?? []).find((h) => h.stage === "Closed");
  const tatEndIso = cancelledAt ?? closedHistoryEntry?.at;
  // Start from the record's real, full-precision createdAt rather than the
  // date-only `receivedDate` field — the latter has no time-of-day
  // component at all, so it was silently rounding every TAT down to
  // midnight (mirrors AN-CRM's own TAT, which runs from createdAt too).
  const tatStartMs = recordCreatedAt
    ? new Date(recordCreatedAt).getTime()
    : receivedDate
      ? new Date(receivedDate).getTime()
      : undefined;
  const tatEndMs = tatEndIso ? new Date(tatEndIso).getTime() : nowTick;
  const tatHours =
    tatStartMs !== undefined && !Number.isNaN(tatStartMs) && !Number.isNaN(tatEndMs)
      ? Math.max(0, (tatEndMs - tatStartMs) / 3_600_000)
      : undefined;
  const tatRunning = !terminal;

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

  function openAddBrand() {
    setBrandPickerOpen(false);
    setNewCatalogName("");
    setAddCatalogError(null);
    setAddBrandOpen(true);
  }

  function openAddModel() {
    setModelPickerOpen(false);
    setNewCatalogName("");
    setAddCatalogError(null);
    setAddModelOpen(true);
  }

  async function submitAddCatalog() {
    const name = newCatalogName.trim();
    if (!name) return;
    const isBrand = addBrandOpen;
    const action = isBrand ? addBrandAction : addModelAction;
    if (!action) return;
    setAddCatalogPending(true);
    setAddCatalogError(null);
    const result = await action(isBrand ? { name } : { name, brandName: brand.name });
    setAddCatalogPending(false);
    if (result?.error) {
      setAddCatalogError(result.error);
      return;
    }
    const option: SearchSelectOption = { value: result?.id ?? name, label: result?.label ?? name };
    if (isBrand) {
      setBrandOptionsState((prev) => [...prev, option]);
      selectBrand(option);
      setAddBrandOpen(false);
    } else {
      setModelOptionsState((prev) => [...prev, option]);
      selectModel(option);
      setAddModelOpen(false);
    }
  }

  /**
   * Going on hold now captures WHY and the brand's part-order reference
   * (the reference app's Mark Part Pending modal does the same) instead of
   * silently stamping the hardcoded "Awaiting parts" the bare toggle used
   * to — with no reference, a stalled job had nothing to chase the supplier
   * with. Resuming needs no prompt, so it stays a one-click action.
   */
  function confirmHold() {
    const reason = holdReasonDraft.trim() || "Awaiting parts";
    const ref = brandJobNoDraft.trim();
    run(
      async () => {
        await setWorkorderHoldAction(partnerId, workorderId, true, reason);
        await patchServiceCentreWorkorderAction(partnerId, workorderId, { brandJobNoForPartOrder: ref || undefined });
      },
      () => {
        setHold(true);
        setBrandJobNo(ref);
        setHoldModalOpen(false);
        announceSuccess("Marked Part Pending.");
      }
    );
  }

  function resumeFromHold() {
    setHold(false);
    run(() => setWorkorderHoldAction(partnerId, workorderId, false), () => announceSuccess("Repair resumed."));
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
        announceSuccess("Invoice created.");
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
        announceSuccess("Workorder Cancelled.");
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
    // Estimate approval no longer gates entering "In Progress" — AN-CRM's
    // real flow has no equivalent block, so Proceed for Repair now works
    // unconditionally. The estimate/approval UI itself (Mark Estimate
    // Approved, the Estimate card, Generate/Print Estimate) is untouched —
    // it's just no longer a precondition to advancing the stage.
    // Mirrors assertLegalStageTransition's server-side rule (and the
    // reference app's close route): a repair with nothing recorded against
    // it would produce an empty invoice at handover.
    if (next === "Completed" && serviceLines.length === 0 && partLines.length === 0) {
      setCloseBlockedMessage(
        "Add at least one part or service line before marking the repair completed — otherwise there's nothing to hand over or invoice."
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
    persist({ stage: next }, `Marked ${next}.`);
    if (next === "Completed") {
      // Side effect, mirrors POS checkout: deduct consumed parts from live Inventory stock once the repair is done.
      startPersist(async () => {
        await deductInventoryForWorkorderAction(partnerId, workorderId);
      });
    }
  }

  /**
   * Both names are mandatory at close, mirroring the reference app's close
   * route (its `engineerName` body field and `paymentCollectedByName`).
   * Handing a repaired unit back with no record of who repaired it and no
   * record of who released it is exactly the gap these two fields exist to
   * shut, so the button is disabled until both are filled and the action is
   * guarded again here rather than trusting the disabled state.
   */
  const handoverNamesMissing = !engineer.trim() || !collectedBy.trim();

  function confirmClose() {
    if (handoverNamesMissing) {
      setActionError("Engineer / Serviced By and Collected By are both required before a workorder can be closed.");
      return;
    }
    setStage("Closed");
    setConfirmCloseOpen(false);
    persist(
      {
        stage: "Closed",
        handoverNotes,
        engineerName: engineer.trim(),
        collectedByName: collectedBy.trim(),
        handedOverAt: new Date().toISOString(),
      },
      "Workorder Closed."
    );
  }

  function persistHandoverNotes() {
    persist({ handoverNotes });
  }

  function persistRemark() {
    persist({ remark: remarkText });
  }

  function persistEngineerRemark() {
    persist({ engineerRemark: engineerRemarkText });
  }

  function persistEngineerName() {
    persist({ engineerName: engineer.trim() || undefined });
  }

  /** "Solution" dropdown + "+ Add Solution" button on the Engineer Remark &
   * Solution card — a second entry point to the exact same addSolution()
   * mutation the modal-driven "+ Add Service/Labour Charge" button above
   * already uses, just picked from an inline <select> instead of the
   * search modal, matching AN-CRM's own layout for this card. */
  function addSelectedSolution() {
    const option = solutionOptions.find((o) => o.value === solutionSelectValue);
    if (!option) return;
    addSolution(option);
    setSolutionSelectValue("");
  }

  // Primary stage-progress action's label — same rule advanceStage() itself
  // gates against (estimate approval / non-empty lines / unresolved
  // serials), surfaced as the header's primary button (the only place it
  // now renders — see "Stage actions" below, which used to duplicate it).
  const primaryStageLabel =
    stage === "Created" ? "Proceed for Repair" : stage === "In Progress" ? "Mark Completed" : stage === "Completed" ? "Handover & Close" : null;

  /**
   * Explicit "Save" — matches AN-CRM's header, which has one even though
   * (like here) most fields already persist on blur/change. Re-sends every
   * field this panel can edit inline through the same
   * patchServiceCentreWorkorderAction other controls already use, so a
   * click always leaves the server in sync with whatever's on screen right
   * now — no new mutation invented.
   */
  function saveAll() {
    persist(
      {
        partLines,
        serviceLines,
        handoverNotes,
        remark: remarkText,
        engineerRemark: engineerRemarkText,
        engineerName: engineer.trim() || undefined,
      },
      "Saved."
    );
  }

  // Same eligibility AN-CRM's own "Generate Estimate" greys out on: there's
  // nothing to estimate on a non-chargeable warranty job, once cancelled,
  // or before any part/service line exists.
  const canGenerateEstimate = !underWarranty && !cancelled && (serviceLines.length > 0 || partLines.length > 0);

  const deviceLabel = [brand.name, model.name].filter(Boolean).join(" · ") || "Not set";

  return (
    <div>
      {/* Unified page header — WO number + customer/device subtitle on the
          left, one row of page-level actions on the right. Replaces what
          used to be TWO separate headers (this panel had none, and a
          second "WO-xxxx / Workorder detail" header lived further down in
          the generic RecordDetail block) with the single header AN-CRM's
          own job-sheet detail page has. */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-xl font-bold italic text-text">{recordLabel}</h1>
          {(customerName || deviceLabel) && (
            <p className="mt-1 text-sm text-text-muted">
              {customerName || "—"}
              {deviceLabel !== "Not set" && <> &mdash; {deviceLabel}</>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/partner/${partnerId}/service-centre`} className="btn-outline">
            &larr; Back
          </Link>
          <PrintPopupLink href={`/partner/${partnerId}/service-centre/${workorderId}/document`} className="btn-outline">
            🖨 Print Workorder
          </PrintPopupLink>
          {/* Generate Estimate — greyed out (not hidden) until there's
              something to estimate, matching AN-CRM's own header exactly.
              Same document the "Print Estimate" button used to open lower
              on the page (removed from there to avoid a second identical
              button once it's here). */}
          <button
            type="button"
            className="btn-outline disabled:opacity-50"
            disabled={!canGenerateEstimate}
            onClick={() => openPrintPopup(`/partner/${partnerId}/service-centre/${workorderId}/estimate`)}
          >
            Generate Estimate
          </button>
          <button type="button" className="btn-outline" onClick={saveAll}>
            Save
          </button>
          {/* Mark Part Pending / Resume Repair — the Hold side-state toggle,
              moved up into the header row alongside AN-CRM's own layout
              (previously it only existed further down the page). Same
              handlers (confirmHold via the modal below / resumeFromHold) —
              only reachable mid-repair, same as before. */}
          {stage === "In Progress" && !cancelled && (
            hold ? (
              <button type="button" className="btn-outline" onClick={resumeFromHold}>
                Resume Repair
              </button>
            ) : (
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setHoldReasonDraft(holdReason ?? "");
                  setBrandJobNoDraft(brandJobNo);
                  setActionError(null);
                  setHoldModalOpen(true);
                }}
              >
                Mark Part Pending
              </button>
            )
          )}
          {!terminal && primaryStageLabel && (
            <button
              type="button"
              className="btn-accent disabled:opacity-50"
              onClick={advanceStage}
              disabled={stage === "In Progress" && hold}
            >
              {primaryStageLabel}
            </button>
          )}
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
              Cancel Job Sheet
            </button>
          )}
          <PrintPopupLink href={`/partner/${partnerId}/service-centre/${workorderId}/service-record`} className="btn-outline">
            Service record
          </PrintPopupLink>
          {/* No generic "Edit" action on this page, deliberately — once a
              workorder is created it is never edited wholesale. Every field
              that can legitimately change afterwards (brand/model, parts &
              service lines, engineer/remark, hold, stage, etc.) has its own
              lifecycle-specific control right on this page instead, exactly
              like AN-CRM's real job-sheet detail view. This removes the last
              link to the /edit route from this page — that route file still
              exists (other modules' own edit routes are unaffected) but is
              now unreachable from here. */}
          <DeleteBusinessRecordButton
            partnerId={partnerId}
            moduleSlug="service-centre"
            recordKey={workorderId}
            recordLabel={recordLabel}
          />
        </div>
      </div>

      {/* Milestone stepper — 7-stage MilestoneStatus (mirrors AN-CRM's CrmJobSheet lifecycle),
          derived from the underlying 4-stage WorkorderStage + onHold via mapStageToMilestone()
          so existing records/persistence keep working unmodified (see service-centre.ts). */}
      {cancelled && (
        <div className="mb-3 mt-4">
          <StatusChip label={`Cancelled${cancelReason ? ` — ${cancelReason}` : ""}`} variant="danger" />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      {(() => {
        // PART_PENDING and REPAIR_STARTED collapse onto the REPAIR_IN_PROGRESS
        // step for stepper purposes (see MILESTONE_STEPPER's comment) — only
        // the effective 4-step milestone is looked up against the stepper.
        const rawMilestone = mapStageToMilestone(stage, hold, cancelled);
        const effectiveMilestone: MilestoneStatus =
          rawMilestone === "PART_PENDING" || rawMilestone === "REPAIR_STARTED" ? "REPAIR_IN_PROGRESS" : rawMilestone;
        const currentIdx = MILESTONE_STEPPER.indexOf(effectiveMilestone);
        const history = stageHistory ?? [];
        return (
          <div className="flex flex-wrap items-center gap-1">
            {MILESTONE_STEPPER.map((m, i) => {
              const done = i <= currentIdx;
              const date = fmtStepDate(stepDateFor(m, history, recordCreatedAt ?? receivedDate));
              return (
                <div key={m} className="flex items-center gap-1">
                  <div className={`flex flex-col items-center gap-1 rounded-md px-3 py-1.5 ${done ? "bg-accent-soft" : "bg-bg-raised"}`}>
                    <span className={`flex items-center gap-1 text-xs font-medium ${done ? "text-accent" : "text-text-muted"}`}>
                      {done && <Check className="h-3 w-3" />}
                      {MILESTONE_LABEL[m]}
                    </span>
                    {date && <span className="text-[10px] text-text-muted">{date}</span>}
                  </div>
                  {i < MILESTONE_STEPPER.length - 1 && (
                    <div className={`h-px w-6 ${i < currentIdx ? "bg-accent" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Warranty + running TAT badges — sit at the far right of the same
          stepper row, matching AN-CRM's "Out of Warranty (OOW)" / "TAT:
          47.7h (running)" pair. */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip
          label={underWarranty ? "In Warranty" : "Out of Warranty (OOW)"}
          variant={underWarranty ? "teal" : "amber"}
        />
        {tatHours !== undefined && (
          <StatusChip
            label={`TAT: ${formatTat(tatHours)}${tatRunning ? " (running)" : ""}`}
            variant={tatRunning ? "amber" : "neutral"}
          />
        )}
      </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
        {hold && <StatusChip label={`On Hold${holdReason ? ` — ${holdReason}` : ""}`} variant="danger" />}
      </div>

      {/* Customer & Device — one curated summary card, matching AN-CRM's
          single "Customer & Device" card (Customer / Phone / Device /
          IMEI-Serial, then Fault Reported + Logged By below). Everything
          else about the customer (company/GSTIN/address/city/state/
          pincode) stays in the "More details" section further down the
          page rather than duplicating a whole second field grid here.
          Brand/Model keep their existing picker behaviour — clicking the
          Device row opens the same Brand/Model SearchSelectModals as
          before, just inline in this card instead of two raw boxes. */}
      <div className="mt-4 rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">Customer &amp; Device</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Customer</div>
            <div className="mt-0.5 text-sm text-text">{customerName || "—"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Phone</div>
            <div className="mt-0.5 text-sm text-text">{customerPhone || "—"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Device</div>
            <button
              type="button"
              onClick={() => setBrandPickerOpen(true)}
              className="mt-0.5 block text-left text-sm text-text hover:underline"
            >
              {brand.name ?? "Select brand"}
              {" · "}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (brand.id) setModelPickerOpen(true);
                }}
                className={brand.id ? "hover:underline" : "text-text-muted"}
              >
                {model.name ?? (brand.id ? "Select model" : "Pick a brand first")}
              </span>
            </button>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">IMEI / Serial</div>
            <div className="mt-0.5 text-sm text-text">{imeiOrSerialNumber || "—"}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Fault Reported</div>
            <div className="mt-0.5 text-sm text-text">{faultDescription || "—"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Logged by (CCO)</div>
            <div className="mt-0.5 text-sm text-text">{loggedBy || "—"}</div>
          </div>
        </div>
      </div>

      {(closeBlockedMessage || actionError) && (
        <div className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {closeBlockedMessage ?? actionError}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-success-soft bg-success-soft px-3 py-2 text-sm font-semibold text-success">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            aria-label="Dismiss"
            className="text-success/70 hover:text-success"
          >
            &times;
          </button>
        </div>
      )}

      {/* Parts & Service Lines — directly below Customer & Device, matching
          AN-CRM's own job-sheet card order (Tax Apply checkbox + the three
          add-line buttons in the header row, a BOM-empty warning banner,
          the lines themselves, then the Subtotal/CGST/SGST/Total footer). */}
      <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-text">Parts & Service Lines</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={taxApply}
                disabled={underWarranty}
                onChange={(e) => setTaxApply(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Tax Apply
            </label>
            {editable && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn-outline" onClick={() => setSolutionPickerOpen(true)}>
                  + Add Service/Labour Charge
                </button>
                <button type="button" className="btn-outline" onClick={() => setPartPickerOpen(true)}>
                  + Add Line
                </button>
                {/* Adds a genuinely new material to this partner's own BOM
                    catalog (Inventory > Material Catalog) — distinct from
                    "+ Add Line" above, which only picks an EXISTING BOM
                    material onto this job. Same create route the Material
                    Catalog's own "New" button already uses. */}
                <Link href={`/partner/${partnerId}/inventory/bom/new`} className="btn-outline">
                  + Add New Part to BOM
                </Link>
              </div>
            )}
          </div>
        </div>

        {editable && bomMaterials.length === 0 && (
          <div className="mt-3 rounded-md border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
            No materials found in your BOM yet — add parts under Material Catalog to have them listed here for quick
            selection.
          </div>
        )}

        {serviceLines.length === 0 && partLines.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No lines yet — add a part or service charge.</p>
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

        {/* Totals footer — subtotal / CGST / SGST / payable, matching the
            reference app's own line-items footer. */}
        {(serviceLines.length > 0 || partLines.length > 0) && (
          <div className="mt-4 space-y-1 border-t border-border pt-3">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Subtotal</span>
              <span className="tabular-nums">₹{inr(chargeableSubtotal)}</span>
            </div>
            {!underWarranty && taxApply && (
              <>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>CGST</span>
                  <span className="tabular-nums">₹{inr(taxTotal / 2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>SGST</span>
                  <span className="tabular-nums">₹{inr(taxTotal / 2)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-semibold text-text">
              <span>Total</span>
              <span className="tabular-nums">₹{inr(chargeableSubtotal + taxTotal)}</span>
            </div>
            {underWarranty && (
              <p className="text-xs text-text-muted">
                Costs above are for internal tracking only — this job is under warranty and non-chargeable, so every
                invoice line bills at zero.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Engineer Remark & Solution — second card, directly below Parts &
          Service Lines, matching AN-CRM's job-sheet layout exactly: a
          plain Engineer Remark field, a Solution dropdown + Add button
          (same addSolution() mutation as the modal above), a separate
          Remark field, and Engineer Name with its own close-time helper
          text — editable here too, not only inside the Close Workorder
          modal further down. */}
      <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">Engineer Remark &amp; Solution</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Engineer Remark
            <input
              type="text"
              value={engineerRemarkText}
              disabled={!editable}
              onChange={(e) => setEngineerRemarkText(e.target.value)}
              onBlur={persistEngineerRemark}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text disabled:opacity-60"
            />
          </label>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Solution
            <div className="mt-1 flex items-center gap-2">
              <select
                value={solutionSelectValue}
                disabled={!editable}
                onChange={(e) => setSolutionSelectValue(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-2 text-sm font-normal normal-case tracking-normal text-text disabled:opacity-60"
              >
                <option value="">Select a Solution…</option>
                {solutionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-outline shrink-0"
                disabled={!editable || !solutionSelectValue}
                onClick={addSelectedSolution}
              >
                + Add Solution
              </button>
            </div>
          </div>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Remark
            <input
              type="text"
              value={remarkText}
              disabled={!editable}
              onChange={(e) => setRemarkText(e.target.value)}
              onBlur={persistRemark}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text disabled:opacity-60"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Engineer Name <span className="font-normal normal-case text-text-muted">(prints on the closed job sheet)</span>
            <input
              type="text"
              list="wo-staff-names"
              value={engineer}
              disabled={!editable}
              onChange={(e) => setEngineer(e.target.value)}
              onBlur={persistEngineerName}
              placeholder="Who repaired this device"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text disabled:opacity-60"
            />
          </label>
        </div>
      </div>

      {/* Estimate approval — gates entry into In Progress unless under warranty */}
      {stage === "Created" && !underWarranty && !cancelled && (
        <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
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

      {/* Brand Job No. display — the Mark Part Pending / Resume Repair
          toggle itself now lives once, in the header row above; this just
          surfaces the supplier reference captured when the job was put on
          hold. */}
      {stage === "In Progress" && !cancelled && brandJobNo && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs text-text-muted">Brand Job No.: {brandJobNo}</span>
        </div>
      )}

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

      {/* Stage actions — the primary stage-advance button ("Start
          Progress"/"Mark Completed"/"Handover & Close"), "Print Job Card",
          and "Cancel Workorder" that used to sit here were exact duplicates
          of the header's primary stage-action button, "Print Workorder",
          and "Cancel Job Sheet" respectively (same handlers: advanceStage,
          the same /document print route, and the same cancel modal) — a
          leftover bottom action row from before the header was unified.
          Removed; only the actions with no header equivalent remain. */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* The priced quote the customer approves. Only offered once there's
            something to price, and never for a warranty job — a
            non-chargeable repair has no estimate to approve. */}
        {!underWarranty && !cancelled && (serviceLines.length > 0 || partLines.length > 0) && (
          <button
            type="button"
            className="btn-outline"
            onClick={() => openPrintPopup(`/partner/${partnerId}/service-centre/${workorderId}/estimate`)}
          >
            Print Estimate
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
          <button
            type="button"
            className="btn-outline"
            onClick={() => openPrintPopup(`/partner/${partnerId}/service-centre/${workorderId}/invoice`)}
          >
            Sales Invoice
          </button>
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
        options={brandOptionsState}
        onSelect={selectBrand}
        onAddNew={addBrandAction ? openAddBrand : undefined}
        addNewLabel="Add new brand"
      />
      <SearchSelectModal
        open={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
        title="Select Model"
        options={modelOptionsState}
        onSelect={selectModel}
        onAddNew={addModelAction ? openAddModel : undefined}
        addNewLabel="Add new model"
      />
      <Modal
        open={addBrandOpen || addModelOpen}
        onClose={() => {
          setAddBrandOpen(false);
          setAddModelOpen(false);
        }}
        title={addBrandOpen ? "Add New Brand" : "Add New Model"}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-muted">
              {addBrandOpen ? "Brand name" : `Model name${brand.name ? ` (Brand: ${brand.name})` : ""}`}
            </label>
            <input
              autoFocus
              value={newCatalogName}
              onChange={(e) => setNewCatalogName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              placeholder={addBrandOpen ? "e.g. Samsung" : "e.g. Galaxy S21"}
            />
          </div>
          {addCatalogError && <p className="text-sm text-danger">{addCatalogError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setAddBrandOpen(false);
                setAddModelOpen(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!newCatalogName.trim() || addCatalogPending}
              onClick={submitAddCatalog}
            >
              {addCatalogPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>
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
      {/* Mark Part Pending — captures the reason and the brand's part-order
          reference, matching the reference app's own Part Pending modal. */}
      <Modal
        open={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        title="Mark Part Pending"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setHoldModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={confirmHold}>
              Mark Part Pending
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          This pauses editing on the job without cancelling it. Record what it&apos;s waiting on, and the supplier&apos;s
          own reference for the part order if one was raised.
        </p>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Reason
          <input
            type="text"
            value={holdReasonDraft}
            onChange={(e) => setHoldReasonDraft(e.target.value)}
            placeholder="Awaiting parts"
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Brand Job No. <span className="font-normal normal-case">(optional)</span>
          <input
            type="text"
            value={brandJobNoDraft}
            onChange={(e) => setBrandJobNoDraft(e.target.value)}
            placeholder="The brand's / supplier's part-order reference"
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text"
          />
        </label>
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
            <button
              type="button"
              className="btn-accent disabled:opacity-50"
              onClick={confirmClose}
              disabled={handoverNamesMissing}
            >
              Close Workorder
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          All serialized parts are accounted for. Record who did the work and who handed the unit over, then close
          this workorder. Both names are required.
        </p>
        {/* Suggestions come from the partner's own Staff Names roster when
            they keep one (Pro+). A `list` pointing at an empty <datalist>
            is inert, so a Starter partner simply gets a plain text box —
            no separate code path, and nothing is ever auto-filled. */}
        <datalist id="wo-staff-names">
          {staffNameOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Engineer / Serviced By <span className="text-danger">*</span>
            <input
              type="text"
              list="wo-staff-names"
              value={engineer}
              onChange={(e) => setEngineer(e.target.value)}
              placeholder="Who actually repaired this"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Collected By <span className="text-danger">*</span>
            <input
              type="text"
              list="wo-staff-names"
              value={collectedBy}
              onChange={(e) => setCollectedBy(e.target.value)}
              placeholder="Who handed it over / collected payment"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text"
            />
          </label>
        </div>
        {staffNameOptions.length === 0 && (
          <p className="mt-2 text-xs text-text-muted">
            Type each name in full. Keeping a reusable Staff Names list (so these become pickable) is a Pro feature.
          </p>
        )}
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
