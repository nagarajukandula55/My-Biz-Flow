"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Check, Trash2 } from "lucide-react";
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
import { GST_RATES, MATERIAL_TYPES, RATE_TYPES, UOM_OPTIONS, HSN_CODES } from "@/lib/sample-data/bom";
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
  partnerDefaultLaborCharge,
  addBrandAction,
  addModelAction,
  addBomMaterialAction,
  addSolutionAction,
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
  /** This partner's own live Solutions catalog — a name/category label only, no price attached. */
  solutionOptions: SearchSelectOption[];
  /** Settings > Config's plain default labour charge — pre-fills a new service line's charge, however it was added. */
  partnerDefaultLaborCharge?: number;
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
  /**
   * Bound, tier-checked (inventory.bom.create, Pro+) server action for
   * quick-adding a new BOM material right from this page's "+ Add New Part
   * to BOM" — same createServiceCentreBomMaterialInlineAction the picker's
   * catalog is otherwise read-only against, non-redirecting so this page
   * never navigates away. Omitted entirely (not just disabled) on a partner
   * below Pro, same as addBrandAction/addModelAction.
   */
  addBomMaterialAction?: (values: Record<string, unknown>) => Promise<{ error?: string; id?: string; label?: string }>;
  /** Bound server action for quick-adding a new Solution to this partner's catalog directly from the "no Solutions yet" empty state — Solutions has no tier gate, so this is always provided (unlike addBrandAction/addModelAction/addBomMaterialAction). */
  addSolutionAction?: (values: Record<string, unknown>) => Promise<{ error?: string; id?: string; label?: string }>;
}) {
  const [stage, setStage] = useState<WorkorderStage>(initialStage);
  const [partLines, setPartLines] = useState<PartLine[]>(initialPartLines);
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>(initialServiceLines);
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  // Seeded from the server-computed props, then appended to locally the
  // moment a quick-add succeeds — so the just-created brand/model is
  // immediately selectable in the SAME picker session without a refetch.
  const [brandOptionsState, setBrandOptionsState] = useState(brandOptions);
  const [modelOptionsState, setModelOptionsState] = useState(modelOptions);
  // Same pattern for BOM materials — the "+ Add New Part to BOM" quick-add
  // modal below appends here the moment it succeeds, so the new material's
  // "No materials found" warning banner clears immediately without a refetch.
  const [bomMaterialsState, setBomMaterialsState] = useState(bomMaterials);
  // Same pattern for Solutions — the "+ New Solution" quick-add modal
  // below appends here the moment it succeeds, so it's immediately
  // selectable without a refetch and the "no Solutions yet" hint clears.
  const [solutionOptionsState, setSolutionOptionsState] = useState(solutionOptions);
  const [addSolutionOpen, setAddSolutionOpen] = useState(false);
  const [newSolutionTitle, setNewSolutionTitle] = useState("");
  const [addSolutionError, setAddSolutionError] = useState<string | null>(null);
  const [addSolutionPending, setAddSolutionPending] = useState(false);
  const [addBrandOpen, setAddBrandOpen] = useState(false);
  const [addModelOpen, setAddModelOpen] = useState(false);
  const [newCatalogName, setNewCatalogName] = useState("");
  const [addCatalogError, setAddCatalogError] = useState<string | null>(null);
  const [addCatalogPending, setAddCatalogPending] = useState(false);
  // "+ Add New Part to BOM" quick-add modal — mirrors the Brand/Model
  // quick-add above but with the fuller BOM field set (see submitAddBom).
  const [addBomOpen, setAddBomOpen] = useState(false);
  const [bomDraft, setBomDraft] = useState({
    description: "",
    hsnCode: "",
    uom: UOM_OPTIONS[0],
    rate: "",
    taxPercent: String(GST_RATES[GST_RATES.length - 2] ?? 18),
    type: MATERIAL_TYPES[0] as string,
    rateType: RATE_TYPES[1] as string, // "Without Tax" — matches this page's own Rate/"Excl. GST" convention
    // Optional Brand/Model association — mirrors AN-CRM's own BOM model
    // (brandId/deviceModelId, both optional: a part can be brand-agnostic or
    // pinned to one exact model). Sourced from the SAME brandOptionsState/
    // modelOptionsState already loaded on this page for the Customer &
    // Device picker above, not a separate lookup.
    brandId: "",
    modelId: "",
  });
  const [addBomError, setAddBomError] = useState<string | null>(null);
  const [addBomPending, setAddBomPending] = useState(false);
  // "that list should be visible here" — a simple filter over the existing
  // BOM catalog, shown inside the same modal so the user can see what's
  // already there before deciding to add a new material.
  const [bomBrowseFilter, setBomBrowseFilter] = useState("");
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

  /**
   * Reverse-calc for a tax-inclusive entered price: when a line's rateMode
   * is "incl", the number the user typed into Rate is already the
   * per-unit price WITH taxRate% baked in, so the base (tax-exclusive)
   * rate that must feed Subtotal/CGST/SGST is `entered / (1 + tax/100)`
   * — otherwise tax would be charged twice on top of an already-taxed
   * number. "excl" (the default for every line that predates this field)
   * is the identity case: the entered number already IS the base rate.
   */
  function baseRateOf(entered: number, taxPercent: number, rateMode?: "excl" | "incl"): number {
    return rateMode === "incl" ? entered / (1 + taxPercent / 100) : entered;
  }

  // Estimate covers labor AND parts — parts were previously excluded, so
  // the figure the customer approved never mentioned the biggest cost.
  // Both totals are computed on the BASE (tax-exclusive) rate regardless
  // of rateMode, via baseRateOf() above, so a tax-inclusive line's entered
  // price isn't double-counted as pure profit before tax is added back
  // below.
  const laborTotal = serviceLines.reduce(
    (sum, l) => sum + baseRateOf(l.laborCharge || 0, l.taxRate ?? 18, l.rateMode) * (l.qty || 1),
    0
  );
  const partsTotal = partLines.reduce(
    (sum, p) =>
      p.pending ? sum : sum + baseRateOf(p.unitPrice || 0, p.taxRate ?? 18, p.rateMode) * (p.qty || 1),
    0
  );
  const estimateTotal = laborTotal + partsTotal;
  /**
   * Live tax preview over the same lines, mirroring the reference app's
   * Parts & Service Lines footer — previously the operator could see a bare
   * labour/parts figure but never what the customer would actually be asked
   * to pay, which is the taxed total. Labour and parts each use their own
   * line's stamped/entered tax slab (defaulting to 18% for a line that
   * predates a stored taxRate) — the same rates buildServiceCentreLines()
   * puts on the Estimate and the Sales Invoice, so the three agree.
   *
   * Split CGST/SGST here assumes intra-state supply, the common case and the
   * same assumption the reference app's live preview makes; the printed
   * invoice is where place of supply is resolved for real (a customer in
   * another state is taxed IGST at the full slab instead).
   */
  const laborTax = serviceLines.reduce(
    (sum, l) =>
      sum + baseRateOf(l.laborCharge || 0, l.taxRate ?? 18, l.rateMode) * ((l.taxRate ?? 18) / 100) * (l.qty || 1),
    0
  );
  const partsTax = partLines.reduce(
    (sum, p) =>
      p.pending
        ? sum
        : sum + baseRateOf(p.unitPrice || 0, p.taxRate ?? 18, p.rateMode) * ((p.taxRate ?? 18) / 100) * (p.qty || 1),
    0
  );
  // Tax Apply, unchecked, genuinely zeroes CGST/SGST for these lines — it
  // isn't just a cosmetic checkbox: laborTax/partsTax above are computed
  // unconditionally, but taxTotal (the only place they feed the footer/
  // chargeableSubtotal math) collapses to 0 the moment taxApply is off or
  // the job is under warranty.
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

  /**
   * "+ Add Line" — used to open a SearchSelectModal picker over the BOM
   * catalog (bomMaterials); per user feedback that modal never matched the
   * intended row shape (a free-text "Part / service name" + Qty/Rate/Tax%/
   * Total row you type straight into, not a catalog pick), so this now
   * appends a single blank inline PartLine directly, same mechanism as
   * addBlankServiceLine below. Nothing else on this page picks from the BOM
   * catalog by search any more — the catalog itself still feeds the
   * "No materials found" warning banner and the BOM quick-add modal further
   * down.
   */
  function addBlankPartLine() {
    const next: PartLine[] = [
      ...partLines,
      { id: `PL-${Date.now()}`, materialId: "", materialLabel: "", qty: 1, serialized: false, unitPrice: 0, taxRate: 18 },
    ];
    setPartLines(next);
    persist({ partLines: next });
  }

  /**
   * The "Part / service name" free-text input is backed by the
   * `wo-bom-materials` <datalist> below (bomMaterialsState) — same
   * type-or-pick pattern RecordForm's own `suggestions`/`suggestionsByParent`
   * fields use elsewhere in this app (a plain HTML datalist, no picker
   * component). Typing a value that matches an existing material's label
   * exactly (i.e. the user picked the suggestion, or typed the name of a
   * material that's already in the BOM) stamps that material's own catalog
   * price onto the line — materialId/serialized/unitPrice/taxRate — the
   * same fields the old catalog-picker's addPart() used to stamp, so a
   * looked-up part still prices out correctly instead of sitting at ₹0/18%
   * defaults. Typing something that matches nothing just keeps it a plain
   * free-text line, unpriced, exactly as before.
   */
  function setPartLabel(lineId: string, label: string) {
    setPartLines((prev) =>
      prev.map((p) => {
        if (p.id !== lineId) return p;
        const match = bomMaterialsState.find((m) => m.label === label);
        if (match) {
          return {
            ...p,
            materialLabel: label,
            materialId: match.id,
            serialized: match.serialized,
            unitPrice: match.rate ?? p.unitPrice,
            taxRate: match.taxPercent ?? p.taxRate,
          };
        }
        return { ...p, materialLabel: label, materialId: "" };
      })
    );
  }

  /** Editable per-line quantity — was previously hardcoded to 1 with no input at all. */
  function setPartQty(lineId: string, rawQty: string) {
    const qty = Math.max(1, Math.floor(Number(rawQty) || 1));
    setPartLines((prev) => prev.map((p) => (p.id === lineId ? { ...p, qty } : p)));
  }

  function setPartRate(lineId: string, rawRate: string) {
    const unitPrice = Math.max(0, Number(rawRate) || 0);
    setPartLines((prev) => prev.map((p) => (p.id === lineId ? { ...p, unitPrice } : p)));
  }

  function setPartTaxRate(lineId: string, rawRate: string) {
    const taxRate = Math.max(0, Number(rawRate) || 0);
    setPartLines((prev) => prev.map((p) => (p.id === lineId ? { ...p, taxRate } : p)));
  }

  /** Excl./Incl. GST toggle next to a part line's Rate input — see baseRateOf() for the reverse-calc this drives. A <select>, so it persists immediately on change rather than waiting for a blur. */
  function setPartRateMode(lineId: string, rateMode: "excl" | "incl") {
    const next = partLines.map((p) => (p.id === lineId ? { ...p, rateMode } : p));
    setPartLines(next);
    persist({ partLines: next });
  }

  function removePartLine(lineId: string) {
    const next = partLines.filter((p) => p.id !== lineId);
    setPartLines(next);
    persist({ partLines: next });
  }

  function persistPartQty() {
    persist({ partLines });
  }

  function addSolution(option: SearchSelectOption) {
    // A Solution is just a name/category label, not a price list — no
    // per-solution charge is stored or read here. Pre-fills from Settings
    // > Config's plain default labour charge (same as a blank "+ Add
    // Service/Labour Charge" row), fully editable on the line afterwards.
    const next: ServiceLine[] = [
      ...serviceLines,
      {
        id: `SL-${Date.now()}`,
        solutionId: option.value,
        solutionLabel: option.label,
        laborCharge: partnerDefaultLaborCharge ?? 0,
        qty: 1,
        taxRate: 18,
      },
    ];
    setServiceLines(next);
    persist({ serviceLines: next });
  }

  /**
   * "+ Add Service/Labour Charge" — used to open a SearchSelectModal picker
   * over the Solutions catalog (title "Add Solution"); per user feedback
   * this should instead append a single blank, free-text inline
   * ServiceLine row directly (defaulting qty 1 / tax 18% / rate 0), same
   * mechanism as addBlankPartLine above. The Solutions-catalog-based add
   * (addSolution) is untouched and still reachable from the Engineer
   * Remark & Solution card's own "Solution" dropdown + "+ Add Solution".
   */
  function addBlankServiceLine() {
    const next: ServiceLine[] = [
      ...serviceLines,
      {
        id: `SL-${Date.now()}`,
        solutionId: "",
        solutionLabel: "",
        laborCharge: partnerDefaultLaborCharge ?? 0,
        qty: 1,
        taxRate: 18,
      },
    ];
    setServiceLines(next);
    persist({ serviceLines: next });
  }

  function setServiceLabel(lineId: string, label: string) {
    setServiceLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, solutionLabel: label } : l)));
  }

  function setServiceQty(lineId: string, rawQty: string) {
    const qty = Math.max(1, Math.floor(Number(rawQty) || 1));
    setServiceLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, qty } : l)));
  }

  function setServiceTaxRate(lineId: string, rawRate: string) {
    const taxRate = Math.max(0, Number(rawRate) || 0);
    setServiceLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, taxRate } : l)));
  }

  /** Excl./Incl. GST toggle next to a service line's Rate input — see baseRateOf() for the reverse-calc this drives. A <select>, so it persists immediately on change rather than waiting for a blur. */
  function setServiceRateMode(lineId: string, rateMode: "excl" | "incl") {
    const next = serviceLines.map((l) => (l.id === lineId ? { ...l, rateMode } : l));
    setServiceLines(next);
    persist({ serviceLines: next });
  }

  function removeServiceLine(lineId: string) {
    const next = serviceLines.filter((l) => l.id !== lineId);
    setServiceLines(next);
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

  function openAddBom() {
    setBomDraft({
      description: "",
      hsnCode: "",
      uom: UOM_OPTIONS[0],
      rate: "",
      taxPercent: String(GST_RATES[GST_RATES.length - 2] ?? 18),
      type: MATERIAL_TYPES[0] as string,
      rateType: RATE_TYPES[1] as string,
      brandId: "",
      modelId: "",
    });
    setBomBrowseFilter("");
    setAddBomError(null);
    setAddBomOpen(true);
  }

  /**
   * "+ Add New Part to BOM" quick-add — used to be a plain Link navigating
   * to /inventory/bom/new (an entire separate page), abandoning whatever
   * was in progress on this workorder. Now a modal, mirroring the Add
   * Brand/Model pattern above but with the fuller field set the real BOM
   * catalog (Material Catalog) actually asks for on its own create form
   * (see bomFormFields in src/lib/sample-data/bom.ts): Description, HSN
   * Code, Type, UOM, Rate, Rate Type ("this rate is" inclusive/exclusive of
   * tax), and Tax %. Calls the same non-redirecting, tier-checked
   * createServiceCentreBomMaterialInlineAction the standalone page's
   * redirecting sibling wraps.
   */
  async function submitAddBom() {
    const description = bomDraft.description.trim();
    const hsnCode = bomDraft.hsnCode.trim();
    const rate = Number(bomDraft.rate);
    if (!description) {
      setAddBomError("Part / Material name is required.");
      return;
    }
    if (!hsnCode) {
      setAddBomError("HSN Code is required.");
      return;
    }
    if (!bomDraft.rate.trim() || Number.isNaN(rate) || rate < 0) {
      setAddBomError("Enter a valid Rate.");
      return;
    }
    if (!addBomMaterialAction) return;
    const taxPercent = Number(bomDraft.taxPercent) || 0;
    // Resolve the picked Brand/Model ids to their display labels from the
    // SAME options already loaded on this page (brandOptionsState/
    // modelOptionsState) rather than a separate lookup — both optional,
    // mirroring AN-CRM's own brand-agnostic-by-default BOM rows.
    const pickedBrand = brandOptionsState.find((b) => b.value === bomDraft.brandId);
    const pickedModel = modelOptionsState.find((m) => m.value === bomDraft.modelId);
    // "This rate is" — With Tax means the number just typed already has
    // taxPercent baked in, so the value actually stored (and read back by
    // every part-line consumer of bomMaterials[].rate, which all assume an
    // exclusive base rate — see baseRateOf() above) must be reverse-
    // calculated to the tax-exclusive base, exactly like a part/service
    // line's own Incl. GST mode does.
    const rateExclTax = bomDraft.rateType === "With Tax" ? rate / (1 + taxPercent / 100) : rate;
    setAddBomPending(true);
    setAddBomError(null);
    const result = await addBomMaterialAction({
      description,
      hsnCode,
      uom: bomDraft.uom,
      rate: rateExclTax,
      rateType: "Without Tax", // stored rate is now always tax-exclusive, regardless of which mode the user picked
      taxPercent,
      type: bomDraft.type,
      status: "Active",
      brandId: pickedBrand?.value || undefined,
      brandName: pickedBrand?.label || undefined,
      modelId: pickedModel?.value || undefined,
      modelName: pickedModel?.label || undefined,
    });
    setAddBomPending(false);
    if (result?.error) {
      setAddBomError(result.error);
      return;
    }
    setBomMaterialsState((prev) => [
      ...prev,
      {
        id: result?.id ?? description,
        label: result?.label ?? description,
        serialized: false,
        rate: rateExclTax,
        taxPercent,
      },
    ]);
    setAddBomOpen(false);
  }

  /** "+ New Solution"/"+ New" quick-add — adds a Solution to this partner's catalog without leaving the workorder, using the same non-redirecting inline-action pattern as Brand/Model/BOM above. No price field — a Solution is a name/category label only. */
  async function submitAddSolution() {
    const title = newSolutionTitle.trim();
    if (!title) {
      setAddSolutionError("Solution name is required.");
      return;
    }
    if (!addSolutionAction) return;
    setAddSolutionPending(true);
    setAddSolutionError(null);
    const result = await addSolutionAction({ title });
    setAddSolutionPending(false);
    if (result?.error) {
      setAddSolutionError(result.error);
      return;
    }
    const option: SearchSelectOption = { value: result?.id ?? title, label: result?.label ?? title };
    setSolutionOptionsState((prev) => [...prev, option]);
    setSolutionSelectValue(option.value);
    setAddSolutionOpen(false);
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
    const option = solutionOptionsState.find((o) => o.value === solutionSelectValue);
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
                {/* Appends a blank, free-text inline row directly to the
                    table (below) — no longer a modal picker over the
                    Solutions catalog. That catalog-based add still exists,
                    just on the Engineer Remark & Solution card's own
                    "+ Add Solution" button further down the page. */}
                <button type="button" className="btn-outline" onClick={addBlankServiceLine}>
                  + Add Service/Labour Charge
                </button>
                {/* Appends a blank, free-text inline row directly to the
                    table — no longer a modal picker over the BOM catalog. */}
                <button type="button" className="btn-outline" onClick={addBlankPartLine}>
                  + Add Line
                </button>
                {/* Adds a genuinely new material to this partner's own BOM
                    catalog (Inventory > Material Catalog) via an inline
                    modal — distinct from "+ Add Line" above, which only
                    adds a line to THIS job. Used to navigate away to
                    /inventory/bom/new; now stays on this page (see the
                    addBomOpen Modal further down), matching the
                    Add Brand/Model quick-add pattern. */}
                {addBomMaterialAction && (
                  <button type="button" className="btn-outline" onClick={openAddBom}>
                    + Add New Part to BOM
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Backs the "Part / service name" free-text input's typeahead — see
            setPartLabel()'s comment. Suggestions only, same inert-when-empty
            behaviour as the "wo-staff-names" datalist further down. */}
        <datalist id="wo-bom-materials">
          {bomMaterialsState.map((m) => (
            <option key={m.id} value={m.label} />
          ))}
        </datalist>

        {editable && bomMaterialsState.length === 0 && (
          <div className="mt-3 rounded-md border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
            No materials found in your BOM yet — add parts under Material Catalog to have them listed here for quick
            selection.
          </div>
        )}

        {serviceLines.length === 0 && partLines.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No lines yet — add a part or service charge.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {/* Service / Labour Charge rows — a plain free-text description
                (typed directly, not picked from the Solutions catalog) plus
                Qty/Rate/Tax%/Total, matching the "Add Line" transcribed
                screenshot's row shape. The Rate field's Excl./Incl. GST
                dropdown drives baseRateOf()'s reverse-calc above: on
                "Incl. GST" the number typed is the tax-inclusive per-unit
                price, so Total still equals qty × entered rate exactly,
                while the base rate feeding Subtotal/CGST/SGST is backed
                out instead of double-taxed. */}
            {serviceLines.map((line) => {
              const qty = line.qty || 1;
              const taxRate = line.taxRate ?? 18;
              const base = baseRateOf(line.laborCharge || 0, taxRate, line.rateMode);
              const lineTotal = (base + (!underWarranty && taxApply ? base * (taxRate / 100) : 0)) * qty;
              return (
                <div key={line.id} className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm">
                  <input
                    type="text"
                    placeholder="Service / Labour Charge"
                    value={line.solutionLabel}
                    disabled={!editable}
                    onChange={(e) => setServiceLabel(line.id, e.target.value)}
                    onBlur={persistLaborCharge}
                    className="min-w-[10rem] flex-1 rounded-md border border-border bg-bg-raised px-2 py-1.5 text-sm text-text disabled:opacity-60"
                  />
                  <label className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    Qty
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={qty}
                      disabled={!editable}
                      onChange={(e) => setServiceQty(line.id, e.target.value)}
                      onBlur={persistLaborCharge}
                      className="w-16 rounded-md border border-border bg-bg-raised px-2 py-1 text-right text-sm tabular-nums text-text disabled:opacity-60"
                    />
                  </label>
                  <label className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    Rate
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
                    <select
                      value={line.rateMode ?? "excl"}
                      disabled={!editable}
                      onChange={(e) => setServiceRateMode(line.id, e.target.value as "excl" | "incl")}
                      className="mt-0.5 w-24 rounded-md border border-border bg-bg-raised px-1 py-0.5 text-[10px] font-normal normal-case tracking-normal text-text-muted disabled:opacity-60"
                    >
                      <option value="excl">Excl. GST</option>
                      <option value="incl">Incl. GST</option>
                    </select>
                  </label>
                  <label className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    Tax %
                    <select
                      value={taxRate}
                      disabled={!editable}
                      onChange={(e) => setServiceTaxRate(line.id, e.target.value)}
                      onBlur={persistLaborCharge}
                      className="w-16 rounded-md border border-border bg-bg-raised px-1 py-1 text-right text-sm tabular-nums text-text disabled:opacity-60"
                    >
                      {GST_RATES.map((r) => (
                        <option key={r} value={r}>
                          {r}%
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    Total
                    <span className="w-24 py-1 text-right text-sm font-semibold tabular-nums text-text">₹{inr(lineTotal)}</span>
                  </div>
                  {editable && (
                    <button
                      type="button"
                      aria-label="Remove line"
                      onClick={() => removeServiceLine(line.id)}
                      className="shrink-0 rounded-md p-1.5 text-danger hover:bg-danger-soft"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
            {partLines.map((line) => {
              const qty = line.qty || 1;
              const taxRate = line.taxRate ?? 18;
              const base = baseRateOf(line.unitPrice || 0, taxRate, line.rateMode);
              const lineTotal = (base + (!underWarranty && taxApply && !line.pending ? base * (taxRate / 100) : 0)) * qty;
              return (
                <div key={line.id} className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-end gap-2">
                    <input
                      type="text"
                      list="wo-bom-materials"
                      placeholder="Part / service name"
                      value={line.materialLabel}
                      disabled={!editable || line.pending}
                      onChange={(e) => setPartLabel(line.id, e.target.value)}
                      onBlur={persistPartQty}
                      className="min-w-[10rem] flex-1 rounded-md border border-border bg-bg-raised px-2 py-1.5 text-sm text-text disabled:opacity-60"
                    />
                    <label className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      Qty
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={qty}
                        disabled={!editable || line.pending}
                        onChange={(e) => setPartQty(line.id, e.target.value)}
                        onBlur={persistPartQty}
                        className="w-16 rounded-md border border-border bg-bg-raised px-2 py-1 text-right text-sm tabular-nums text-text disabled:opacity-60"
                      />
                    </label>
                    <label className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      Rate
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={line.unitPrice ?? 0}
                        disabled={!editable || line.pending}
                        onChange={(e) => setPartRate(line.id, e.target.value)}
                        onBlur={persistPartQty}
                        className="w-24 rounded-md border border-border bg-bg-raised px-2 py-1 text-right text-sm tabular-nums text-text disabled:opacity-60"
                      />
                      <select
                        value={line.rateMode ?? "excl"}
                        disabled={!editable || line.pending}
                        onChange={(e) => setPartRateMode(line.id, e.target.value as "excl" | "incl")}
                        className="mt-0.5 w-24 rounded-md border border-border bg-bg-raised px-1 py-0.5 text-[10px] font-normal normal-case tracking-normal text-text-muted disabled:opacity-60"
                      >
                        <option value="excl">Excl. GST</option>
                        <option value="incl">Incl. GST</option>
                      </select>
                    </label>
                    <label className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      Tax %
                      <select
                        value={taxRate}
                        disabled={!editable || line.pending}
                        onChange={(e) => setPartTaxRate(line.id, e.target.value)}
                        onBlur={persistPartQty}
                        className="w-16 rounded-md border border-border bg-bg-raised px-1 py-1 text-right text-sm tabular-nums text-text disabled:opacity-60"
                      >
                        {GST_RATES.map((r) => (
                          <option key={r} value={r}>
                            {r}%
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex shrink-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      Total
                      <span className="w-24 py-1 text-right text-sm font-semibold tabular-nums text-text">₹{inr(lineTotal)}</span>
                    </div>
                    {editable && (
                      <button
                        type="button"
                        aria-label="Remove line"
                        onClick={() => removePartLine(line.id)}
                        className="shrink-0 rounded-md p-1.5 text-danger hover:bg-danger-soft"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {line.serialized && <StatusChip label="Serialized" variant="amber" />}
                    {line.pending && <StatusChip label="Pending" variant="warning" />}
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
              );
            })}
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

        {!editable && (
          <div className="mt-3 rounded-md border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
            {cancelled
              ? "This workorder is cancelled — its Engineer Remark & Solution can no longer be edited."
              : stage === "Closed"
                ? "This workorder is closed — its Engineer Remark & Solution can no longer be edited."
                : hold
                  ? "This workorder is on hold (Part Pending) — resume the repair below to edit the Engineer Remark & Solution."
                  : "Only editable while the job is In Progress — move it to In Progress to add a solution or edit these fields."}
          </div>
        )}

        {editable && solutionOptionsState.length === 0 && (
          <div className="mt-3 rounded-md border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
            No Solutions found in your catalog yet — click "+ Add Solution" below to add your first one.
          </div>
        )}

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
                {solutionOptionsState.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-outline shrink-0"
                disabled={!editable}
                onClick={() => {
                  // With something picked, just add it as a line. With
                  // nothing to pick (or the catalog is empty), the same
                  // button opens the quick-add modal instead of sitting
                  // there disabled with no way forward.
                  if (solutionSelectValue) {
                    addSelectedSolution();
                  } else if (addSolutionAction) {
                    setNewSolutionTitle("");
                    setAddSolutionError(null);
                    setAddSolutionOpen(true);
                  }
                }}
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
      {/* "+ Add New Part to BOM" quick-add — mirrors the Add Brand/Model
          Modal above but with the fuller BOM field set (see submitAddBom).
          Only rendered when addBomMaterialAction exists (Pro+, tier-checked
          in page.tsx), same as the button that opens it. */}
      <Modal open={addBomOpen} onClose={() => setAddBomOpen(false)} title="Add New Part to BOM">
        <div className="space-y-3">
          {/* "that list should be visible here" — lets the user see what's
              already in the BOM catalog before deciding to add a new
              material, instead of a blank create form with no way to check
              for a duplicate first. */}
          <div>
            <label className="text-xs font-medium text-text-muted">Existing BOM materials ({bomMaterialsState.length})</label>
            <input
              type="text"
              value={bomBrowseFilter}
              onChange={(e) => setBomBrowseFilter(e.target.value)}
              placeholder="Filter existing materials…"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
            <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-border">
              {(() => {
                const q = bomBrowseFilter.trim().toLowerCase();
                const filtered = q
                  ? bomMaterialsState.filter((m) => m.label.toLowerCase().includes(q))
                  : bomMaterialsState;
                if (filtered.length === 0) {
                  return <p className="px-3 py-2 text-xs text-text-muted">No materials found.</p>;
                }
                return filtered.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-xs last:border-b-0"
                  >
                    <span className="text-text">{m.label}</span>
                    {m.rate !== undefined && <span className="tabular-nums text-text-muted">₹{inr(m.rate)}</span>}
                  </div>
                ));
              })()}
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <label className="text-xs font-medium text-text-muted">Part / Material Name</label>
            <input
              autoFocus
              value={bomDraft.description}
              onChange={(e) => setBomDraft((d) => ({ ...d, description: e.target.value }))}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              placeholder="e.g. iPhone 13 Display Assembly"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted">HSN Code</label>
              <select
                value={bomDraft.hsnCode}
                onChange={(e) => setBomDraft((d) => ({ ...d, hsnCode: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
              >
                <option value="">Select…</option>
                {HSN_CODES.map((h) => (
                  <option key={h.code} value={h.code}>
                    {h.code} — {h.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">Unit</label>
              <select
                value={bomDraft.uom}
                onChange={(e) => setBomDraft((d) => ({ ...d, uom: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
              >
                {UOM_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Optional Brand/Model association, mirroring AN-CRM's own BOM
              model (brandId/deviceModelId, both optional — a part can be
              brand-agnostic or pinned to one exact model). Uses the SAME
              brandOptionsState/modelOptionsState already loaded on this
              page for the Customer & Device brand/model pickers above,
              not a separate catalog lookup. */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted">Brand <span className="font-normal text-text-muted">(optional)</span></label>
              <select
                value={bomDraft.brandId}
                onChange={(e) => setBomDraft((d) => ({ ...d, brandId: e.target.value, modelId: "" }))}
                className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
              >
                <option value="">Any brand</option>
                {brandOptionsState.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">Model <span className="font-normal text-text-muted">(optional)</span></label>
              <select
                value={bomDraft.modelId}
                onChange={(e) => setBomDraft((d) => ({ ...d, modelId: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
              >
                <option value="">Any model</option>
                {modelOptionsState.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted">Rate</label>
              <input
                type="number"
                min={0}
                step={1}
                value={bomDraft.rate}
                onChange={(e) => setBomDraft((d) => ({ ...d, rate: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm tabular-nums text-text outline-none focus:border-accent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">Tax %</label>
              <select
                value={bomDraft.taxPercent}
                onChange={(e) => setBomDraft((d) => ({ ...d, taxPercent: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-2 text-sm tabular-nums text-text outline-none focus:border-accent"
              >
                {GST_RATES.map((r) => (
                  <option key={r} value={String(r)}>
                    {r}%
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted">Type</label>
              <select
                value={bomDraft.type}
                onChange={(e) => setBomDraft((d) => ({ ...d, type: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
              >
                {MATERIAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">This rate is</label>
              <select
                value={bomDraft.rateType}
                onChange={(e) => setBomDraft((d) => ({ ...d, rateType: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
              >
                <option value="Without Tax">Without tax</option>
                <option value="With Tax">With tax</option>
              </select>
            </div>
          </div>
          {addBomError && <p className="text-sm text-danger">{addBomError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-outline" onClick={() => setAddBomOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={addBomPending} onClick={submitAddBom}>
              {addBomPending ? "Saving…" : "Save to BOM"}
            </button>
          </div>
        </div>
      </Modal>
      <Modal open={addSolutionOpen} onClose={() => setAddSolutionOpen(false)} title="New Solution">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-muted">Solution name</label>
            <input
              autoFocus
              value={newSolutionTitle}
              onChange={(e) => setNewSolutionTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              placeholder="e.g. Screen replacement"
            />
          </div>
          {addSolutionError && <p className="text-sm text-danger">{addSolutionError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-outline" onClick={() => setAddSolutionOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={addSolutionPending} onClick={submitAddSolution}>
              {addSolutionPending ? "Saving…" : "Save Solution"}
            </button>
          </div>
        </div>
      </Modal>
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
