"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { Check, Trash2 } from "lucide-react";
import { openPrintPopup } from "@/lib/openPrintPopup";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { PrintPopupLink } from "@/components/PrintPopupLink";
import { SearchSelectModal, type SearchSelectOption } from "@/components/SearchSelectModal";
import { InlineTypeahead } from "@/components/InlineTypeahead";
import { CustomerDataOtpGate } from "../customers/CustomerDataOtpGate";
import {
  WORKORDER_STAGES,
  MILESTONE_STATUSES,
  PAYMENT_MODES,
  mapStageToMilestone,
  computeWorkorderTat,
  formatTatHours,
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

/** Masks all but the last 4 digits of a customer's contact number, same convention as maskAccountNumber (BillingInvoiceForm.tsx). */
function maskPhone(phone?: string): string {
  const v = (phone ?? "").trim();
  if (!v) return "";
  if (v.length <= 4) return v;
  return `•••• ${v.slice(-4)}`;
}

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

/**
 * Engineer/Collected-By name entry — a dropdown of the partner's Staff
 * Names roster (Pro+) with an "Other" escape hatch to free text, instead
 * of a free-text input with a datalist (which never constrains the value
 * and silently offers no suggestions at all on Starter, where the roster
 * is empty). Starter partners (no options) always get plain free text.
 */
function StaffNameField({
  label,
  required,
  value,
  onChange,
  onCommit,
  options,
  freeText,
  setFreeText,
  placeholder,
  className,
  disabled,
  onAddNew,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  /** Fires once a value is actually settled (blur, or a dropdown pick) — same moment the old onBlur-based persistence ran. */
  onCommit?: () => void;
  options: string[];
  freeText: boolean;
  setFreeText: (v: boolean) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Opens the "+ Add Staff Name" modal — omitted entirely on a partner below Pro (see addStaffNameAction). */
  onAddNew?: () => void;
}) {
  const showSelect = options.length > 0 && !freeText;
  return (
    <label className={`text-xs font-semibold uppercase tracking-wide text-text-muted ${className ?? ""}`}>
      <span className="flex items-center justify-between gap-2">
        <span>
          {label} {required && <span className="text-danger">*</span>}
        </span>
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="font-semibold normal-case tracking-normal text-teal hover:underline"
          >
            + Add new
          </button>
        )}
      </span>
      {showSelect ? (
        <select
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            if (e.target.value === "__other__") {
              setFreeText(true);
              onChange("");
              return;
            }
            onChange(e.target.value);
            onCommit?.();
          }}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text disabled:opacity-60"
        >
          <option value="">Select…</option>
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value="__other__">Other — type manually…</option>
        </select>
      ) : (
        <>
          <input
            type="text"
            required={required}
            disabled={disabled}
            value={value}
            autoFocus={freeText}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onCommit}
            placeholder={placeholder}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text disabled:opacity-60"
          />
          {options.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFreeText(false);
                onChange("");
              }}
              className="mt-1 text-xs font-semibold normal-case tracking-normal text-teal hover:underline"
            >
              &larr; Choose from list instead
            </button>
          )}
        </>
      )}
    </label>
  );
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
  solutionId,
  solutionLabel,
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
  paymentMode: initialPaymentMode,
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
  addStaffNameAction,
  customerDataUnlocked,
  materialAvailability,
  createPnaAction,
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
  /**
   * The diagnosed Solution — a plain top-level record field (same
   * untyped-JSON-blob pattern as engineerRemark above), NOT derived from
   * or stored on any ServiceLine. Deliberately not billable: it's a
   * diagnosis label only, per explicit direction that a Solution pick
   * must never itself become a priced line item.
   */
  solutionId?: string;
  solutionLabel?: string;
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
  /** Mode of payment recorded at handover close (or later, if collected at invoice time instead) — the same PAYMENT_MODES list used by the Create Invoice modal. */
  paymentMode?: string;
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
  /** Bound, tier-checked (service-centre.staff-names.create, Pro+) server action for quick-adding a new roster entry right from the Engineer/Collected By dropdowns — omitted entirely on a partner below Pro, same as addBrandAction/addModelAction. */
  addStaffNameAction?: (values: Record<string, unknown>) => Promise<{ error?: string; id?: string; label?: string }>;
  /**
   * True once this partner's own Telegram-verified customer-data unlock
   * (isCustomerDataUnlocked, src/lib/customerDataAccess.ts — same gate the
   * Customers list/detail pages use) is currently active. Only consulted
   * for a Closed workorder's Contact No. below — every other stage always
   * shows the real value, matching today's behaviour.
   */
  customerDataUnlocked: boolean;
  /** Material code (e.g. "MAT-1001") -> live per-warehouse Available Qty text, same shape getAvailabilityByMaterial (src/lib/inventoryStock.ts) returns elsewhere — shown under each part line's material input so staff can see what's actually on hand before promising a part. */
  materialAvailability: Record<string, string>;
  /** Creates a "Part Not Available" tracking entry (service-centre-pna) — see PnaModal below. */
  createPnaAction: (payload: {
    workorderId: string;
    materialId: string;
    materialLabel: string;
    qty: number;
    customerName?: string;
    customerPhone?: string;
    brandJobNo?: string;
  }) => Promise<void>;
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
  // Same pattern for the Staff Names roster — the "+ Add Staff Name"
  // quick-add modal below appends here the moment it succeeds, so the new
  // name is immediately selectable in the Engineer/Collected By dropdowns.
  const [staffNameOptionsState, setStaffNameOptionsState] = useState(staffNameOptions);
  const [addStaffNameOpen, setAddStaffNameOpen] = useState(false);
  const [addStaffNameTarget, setAddStaffNameTarget] = useState<"engineer" | "collectedBy" | null>(null);
  const [newStaffNameDraft, setNewStaffNameDraft] = useState("");
  const [addStaffNameError, setAddStaffNameError] = useState<string | null>(null);
  const [addStaffNamePending, setAddStaffNamePending] = useState(false);
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
  const [pnaBrandJobNoDraft, setPnaBrandJobNoDraft] = useState("");
  const [pnaSubmitting, setPnaSubmitting] = useState(false);
  const [closeBlockedMessage, setCloseBlockedMessage] = useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState(initialHandoverNotes ?? "");
  const [remarkText, setRemarkText] = useState(remark ?? "");
  const [engineerRemarkText, setEngineerRemarkText] = useState(engineerRemark ?? "");
  // The diagnosed Solution — plain workorder fields, not a ServiceLine
  // (see selectSolution()'s doc comment).
  const [solutionSelectValue, setSolutionSelectValue] = useState(solutionId ?? "");
  const [selectedSolutionLabel, setSelectedSolutionLabel] = useState(solutionLabel ?? "");
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
  // Both name fields render as a dropdown of the partner's Staff Names
  // roster by default; a field flips to free text only when the operator
  // explicitly picks "Other" (Starter has no roster, so it's always free
  // text there — see StaffNameField below).
  const [engineerFreeText, setEngineerFreeText] = useState(false);
  const [collectedByFreeText, setCollectedByFreeText] = useState(false);
  const [hold, setHold] = useState(Boolean(onHold));
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  // IMEI/Serial No. wasn't always captured at intake — Mark Completed now
  // asks for it inline (once) when it's still missing at that point,
  // instead of silently leaving the gap forever. Optional/unused once a
  // value already exists (no forced re-entry).
  const [imei, setImei] = useState(imeiOrSerialNumber ?? "");
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [imeiDraft, setImeiDraft] = useState("");
  // Customer contact number on a Closed workorder is masked until this
  // partner's own Telegram OTP unlock (customerDataUnlocked) is active —
  // reuses the same CustomerDataOtpGate the Customers list/detail pages
  // show, just opened from a modal here instead of blocking the whole page.
  const [contactUnlockOpen, setContactUnlockOpen] = useState(false);
  const [holdReasonDraft, setHoldReasonDraft] = useState("");
  const [brandJobNoDraft, setBrandJobNoDraft] = useState(brandJobNoForPartOrder ?? "");
  const [brandJobNo, setBrandJobNo] = useState(brandJobNoForPartOrder ?? "");
  const [invoice, setInvoice] = useState(invoiceId);
  const [cancelled, setCancelled] = useState(Boolean(cancelledAt));
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReasonDraft, setCancelReasonDraft] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>(initialPaymentMode ?? PAYMENT_MODES[0]);
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
   * Queue every persist so at most one patchServiceCentreWorkorderAction
   * call is ever in flight for this record at a time. That action does a
   * read-modify-write (reads the record, spreads the patch over it, writes
   * it back) — it is NOT atomic. Two of these firing concurrently (e.g. an
   * "excl/incl" select's immediate onChange persist overlapping a nearby
   * field's onBlur persist while the first request is still in flight)
   * would both read the same pre-write snapshot, and whichever write lands
   * second would silently clobber the first one's already-saved fields
   * with that stale snapshot — a lost update. Chaining onto this ref
   * instead serializes them: each persist only starts once the previous
   * one has actually finished, so every write sees the other's result.
   */
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  /**
   * Every mutation goes through here so a Server Action rejection (an
   * illegal stage transition, a missing record, an empty cancel reason)
   * surfaces in the UI rather than vanishing into an unhandled transition.
   */
  function run(fn: () => Promise<void>, onSuccess?: () => void) {
    setActionError(null);
    persistQueueRef.current = persistQueueRef.current
      .catch(() => {})
      .then(
        () =>
          new Promise<void>((resolve) => {
            startPersist(async () => {
              try {
                await fn();
                onSuccess?.();
              } catch (error) {
                setActionError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
              } finally {
                resolve();
              }
            });
          })
      );
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
  /** discountPercent (0-100) is applied to the base rate AFTER the incl/excl-GST reverse-calc, so a discount is always a discount off the true pre-tax price, never off a tax-inclusive figure. */
  function baseRateOf(entered: number, taxPercent: number, rateMode?: "excl" | "incl", discountPercent?: number): number {
    const base = rateMode === "incl" ? entered / (1 + taxPercent / 100) : entered;
    return discountPercent ? base * (1 - Math.min(100, Math.max(0, discountPercent)) / 100) : base;
  }

  // Estimate covers labor AND parts — parts were previously excluded, so
  // the figure the customer approved never mentioned the biggest cost.
  // Both totals are computed on the BASE (tax-exclusive) rate regardless
  // of rateMode, via baseRateOf() above, so a tax-inclusive line's entered
  // price isn't double-counted as pure profit before tax is added back
  // below.
  const laborTotal = serviceLines.reduce(
    (sum, l) => sum + baseRateOf(l.laborCharge || 0, l.taxRate ?? 18, l.rateMode, l.discountPercent) * (l.qty || 1),
    0
  );
  const partsTotal = partLines.reduce(
    (sum, p) =>
      p.pending ? sum : sum + baseRateOf(p.unitPrice || 0, p.taxRate ?? 18, p.rateMode, p.discountPercent) * (p.qty || 1),
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
      sum + baseRateOf(l.laborCharge || 0, l.taxRate ?? 18, l.rateMode, l.discountPercent) * ((l.taxRate ?? 18) / 100) * (l.qty || 1),
    0
  );
  const partsTax = partLines.reduce(
    (sum, p) =>
      p.pending
        ? sum
        : sum + baseRateOf(p.unitPrice || 0, p.taxRate ?? 18, p.rateMode, p.discountPercent) * ((p.taxRate ?? 18) / 100) * (p.qty || 1),
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
  // (running)" badge next to the stepper. Shared with the Workorders list
  // page (which computes the same thing per row at render time) via
  // computeWorkorderTat() — see src/lib/sample-data/service-centre.ts.
  const { hours: tatHours, running: tatRunning } = computeWorkorderTat({
    recordCreatedAt,
    receivedDate,
    stageHistory,
    cancelledAt,
    terminal,
    nowMs: nowTick,
  });

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
   * The "Part / service name" free-text input is backed by an
   * InlineTypeahead over bomMaterialsState (a styled suggestion dropdown
   * this app renders itself, not a native `<datalist>` popup — a
   * datalist's list is drawn by the OS/browser and can't be styled,
   * which is why it used to show up as a plain unstyled dark box).
   * Typing a value that matches an existing material's label
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

  /** Rate itself is no longer hand-typed for a part line — it's always whatever the selected BOM material's catalog rate is (see the material-select handler above, `unitPrice: match.rate`). A discount is the one way to move the price off catalog, so it's tracked separately instead of letting the rate be edited directly. */
  function setPartDiscount(lineId: string, rawPercent: string) {
    const discountPercent = Math.min(100, Math.max(0, Number(rawPercent) || 0));
    setPartLines((prev) => prev.map((p) => (p.id === lineId ? { ...p, discountPercent } : p)));
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

  /**
   * The diagnosed Solution is a plain field on the workorder itself — NOT
   * a billable line item. Previously picking one pushed a priced
   * ServiceLine (qty/rate/tax) straight into the Parts & Service Lines
   * table, so a diagnosis-only pick silently became a chargeable row on
   * the invoice. If an actual labour charge needs billing for the repair,
   * that's still added separately via "+ Add Service/Labour Charge"
   * (addBlankServiceLine below), unaffected by this.
   */
  function selectSolution(option: SearchSelectOption) {
    setSolutionSelectValue(option.value);
    setSelectedSolutionLabel(option.label);
    persist({ solutionId: option.value, solutionLabel: option.label });
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

  function setServiceDiscount(lineId: string, rawPercent: string) {
    const discountPercent = Math.min(100, Math.max(0, Number(rawPercent) || 0));
    setServiceLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, discountPercent } : l)));
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

  /**
   * "Part Not Available" — the actual staff-facing action behind the
   * per-line Mark Pending flow: creates a real service-centre-pna tracking
   * record (so owner/staff have a list to go source the part from, not
   * just a flag on this one workorder) AND marks the line pending, same as
   * markPending above. Optionally carries the supplier's own Brand Job No.
   * reference if one was raised while marking it.
   */
  async function markPna(lineId: string) {
    const line = partLines.find((p) => p.id === lineId);
    if (!line) return;
    setPnaSubmitting(true);
    try {
      await createPnaAction({
        workorderId,
        materialId: line.materialId || line.materialLabel,
        materialLabel: line.materialLabel,
        qty: line.qty || 1,
        customerName,
        customerPhone,
        brandJobNo: pnaBrandJobNoDraft.trim() || undefined,
      });
      markPending(lineId);
    } finally {
      setPnaSubmitting(false);
      setPnaBrandJobNoDraft("");
    }
  }

  /** "Close Line" — the other PNA option: drop the part line entirely rather than track it for sourcing, e.g. the customer declined the repair for that part. */
  function closePnaLine(lineId: string) {
    removePartLine(lineId);
    setPendingLineId(null);
    setPnaBrandJobNoDraft("");
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

  function openAddStaffName(target: "engineer" | "collectedBy") {
    setAddStaffNameTarget(target);
    setNewStaffNameDraft("");
    setAddStaffNameError(null);
    setAddStaffNameOpen(true);
  }

  async function submitAddStaffName() {
    const name = newStaffNameDraft.trim();
    if (!name || !addStaffNameAction) return;
    setAddStaffNamePending(true);
    setAddStaffNameError(null);
    const result = await addStaffNameAction({ name });
    setAddStaffNamePending(false);
    if (result?.error) {
      setAddStaffNameError(result.error);
      return;
    }
    const addedName = result?.label ?? name;
    setStaffNameOptionsState((prev) => (prev.includes(addedName) ? prev : [...prev, addedName].sort()));
    if (addStaffNameTarget === "engineer") setEngineer(addedName);
    else if (addStaffNameTarget === "collectedBy") setCollectedBy(addedName);
    setAddStaffNameOpen(false);
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
    selectSolution(option);
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

  /** Completes the IMEI-was-missing detour from advanceStage() above, then finishes the same Mark Completed transition it would otherwise have run directly. */
  function confirmMarkCompleted() {
    const value = imeiDraft.trim();
    if (!value) return;
    setCompleteModalOpen(false);
    // Inventory is checked and deducted BEFORE the stage actually flips —
    // if there isn't enough stock for a line, the job stays where it was
    // and the shortage shows as an error, rather than "Completed" already
    // being persisted by the time a shortage is discovered.
    run(
      () => deductInventoryForWorkorderAction(partnerId, workorderId),
      () => {
        setImei(value);
        setStage("Completed");
        persist({ stage: "Completed", imeiOrSerialNumber: value }, "Marked Completed.");
      }
    );
  }

  /**
   * Failure-recovery only: creates the invoice for a workorder that is
   * already Closed but has no `invoice` yet (i.e. the invoice-creation call
   * inside confirmClose errored). This is NOT a general "create invoice
   * whenever" button any more — it's only reachable from the "Retry
   * Invoice Creation" affordance, which itself only renders for
   * `stage === "Closed" && !invoice`. createInvoiceFromWorkorderAction is
   * idempotent (it no-ops if the workorder already has an invoiceId), so
   * this is safe even if it somehow fires twice.
   */
  function createInvoice() {
    const collected = !underWarranty;
    run(
      () =>
        createInvoiceFromWorkorderAction(partnerId, workorderId, {
          collected,
          mode: collected ? paymentMode : undefined,
          amount: undefined,
        }),
      () => {
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
    // No line-item requirement: a call can legitimately resolve with no
    // part consumed and no billable service (guidance-only, no-fault-found),
    // and must still be closeable — see assertLegalStageTransition in
    // actions.ts for the matching server-side rule (removed there too).
    // Mirrors assertLegalStageTransition's server-side Solution check
    // (actions.ts) — the engineer must select a Solution before the repair
    // can be marked completed. Solution is a plain workorder field, not a
    // ServiceLine (see selectSolution()'s doc comment).
    if (next === "Completed" && !solutionSelectValue) {
      setCloseBlockedMessage(
        "Select a Solution before marking the repair completed — the fault diagnosis/solution is required."
      );
      return;
    }
    if (next === "Completed" && !engineer.trim()) {
      setCloseBlockedMessage(
        "Enter the Engineer / Serviced By name before marking the repair completed."
      );
      return;
    }
    if (next === "Completed" && !imei.trim()) {
      setImeiDraft("");
      setCompleteModalOpen(true);
      return;
    }
    if (next === "Closed") {
      if (unresolvedSerials.length > 0) {
        setCloseBlockedMessage(
          `${unresolvedSerials.length} part line(s) are serialized but missing a Serial/IMEI number. Enter the serial or mark the line Pending before closing — this validates against warehouse stock.`
        );
        return;
      }
      // Payment is now captured in the same modal as the close confirmation
      // (invoice creation happens atomically with handover — see
      // confirmClose) rather than as a later, separate "Create Invoice"
      // step. A chargeable job is always treated as paid in full at
      // handover; a warranty job has nothing to collect.
      setConfirmCloseOpen(true);
      return;
    }
    if (next === "Completed") {
      // Same inventory-first-then-persist ordering as confirmMarkCompleted
      // above (this is the branch that runs when IMEI was already on file,
      // so Mark Completed never went through that detour) — a stock
      // shortage blocks the stage from flipping at all.
      run(
        () => deductInventoryForWorkorderAction(partnerId, workorderId),
        () => {
          setStage(next);
          persist({ stage: next }, `Marked ${next}.`);
        }
      );
      return;
    }
    setStage(next);
    persist({ stage: next }, `Marked ${next}.`);
  }

  /**
   * Engineer is already mandatory earlier, at Mark Completed (advanceStage's
   * own gate) — Close Workorder only re-requires Collected By, the name of
   * whoever actually released the unit / took the payment at handover.
   */
  const handoverNamesMissing = !collectedBy.trim();

  /**
   * Close + invoice, atomically, as one confirm action — the invoice used
   * to be a separate "Create Invoice" button reachable any time after
   * Closed; now it's generated at the moment of handover and nowhere else.
   * The two server calls still happen sequentially (there's no single
   * transactional action spanning both records), so stage is flipped to
   * "Closed" locally as soon as the close patch lands, before the invoice
   * call runs — if invoice creation then fails, the workorder still shows
   * Closed (matching what's now true server-side) and the "Retry Invoice
   * Creation" affordance (stage === "Closed" && !invoice) picks up from
   * there, rather than the UI silently reverting to "In Progress" for a
   * close that actually succeeded.
   */
  function confirmClose() {
    if (handoverNamesMissing) {
      setActionError("Collected By is required before a workorder can be closed.");
      return;
    }
    const collected = !underWarranty;
    setConfirmCloseOpen(false);
    run(
      async () => {
        await patchServiceCentreWorkorderAction(partnerId, workorderId, {
          stage: "Closed",
          handoverNotes,
          engineerName: engineer.trim(),
          collectedByName: collectedBy.trim(),
          paymentMode,
          handedOverAt: new Date().toISOString(),
        });
        setStage("Closed");
        try {
          await createInvoiceFromWorkorderAction(partnerId, workorderId, {
            collected,
            mode: collected ? paymentMode : undefined,
            amount: undefined,
          });
          setInvoice("pending"); // optimistic; page revalidation fills in the real id on next load
        } catch {
          throw new Error(
            "Workorder closed, but invoice creation failed. Use \"Retry Invoice Creation\" below to try again."
          );
        }
      },
      () => announceSuccess("Workorder Closed and Invoice Created.")
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
        solutionId: solutionSelectValue,
        solutionLabel: selectedSolutionLabel,
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
          {/* Retry Invoice Creation / Sales Invoice — moved up from a
              "Stage actions" row that used to sit near the bottom of the
              page, below Handover & Close and above Activity. All
              workorder actions belong together at the top right, not
              scattered further down the page. */}
          {stage === "Closed" && !cancelled && !invoice && (
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setActionError(null);
                createInvoice();
              }}
            >
              Retry Invoice Creation
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
            label={`TAT: ${formatTatHours(tatHours)}${tatRunning ? " (running)" : ""}`}
            variant={tatRunning ? "amber" : "neutral"}
          />
        )}
      </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
        {hold && <StatusChip label={`On Hold${holdReason ? ` — ${holdReason}` : ""}`} variant="danger" />}
      </div>

      {/* Customer & Device — one curated summary card, matching AN-CRM's
          single "Customer & Device" card. Per product-owner request, the
          Customer Contact No., Logged By, and IMEI/Serial No. fields are no
          longer shown on this summary card (they're still collected at
          intake/edit and still appear on the printable job card / service
          record documents). Everything else about the customer
          (company/GSTIN/address/city/state/pincode) stays in the "More
          details" section further down the page rather than duplicating a
          whole second field grid here. Brand/Model keep their existing
          picker behaviour — clicking the Device row opens the same
          Brand/Model SearchSelectModals as before, just inline in this
          card instead of two raw boxes. */}
      <div className="mt-4 rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">Customer &amp; Device</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Customer</div>
            <div className="mt-0.5 text-sm text-text">{customerName || "—"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Contact No.</div>
            {/* Closed workorders mask the customer's contact number behind
                the same Telegram-OTP unlock the Customers list/detail pages
                use (customerDataUnlocked, isCustomerDataUnlocked) — every
                other stage, and an already-unlocked session, show it plain,
                exactly as before. */}
            {stage === "Closed" && customerPhone && !customerDataUnlocked ? (
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-sm text-text">{maskPhone(customerPhone)}</span>
                <button
                  type="button"
                  onClick={() => setContactUnlockOpen(true)}
                  className="text-xs font-semibold text-teal hover:underline"
                >
                  Unlock
                </button>
              </div>
            ) : (
              <div className="mt-0.5 text-sm text-text">{customerPhone || "—"}</div>
            )}
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
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Fault Reported</div>
            <div className="mt-0.5 text-sm text-text">{faultDescription || "—"}</div>
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
              const base = baseRateOf(line.laborCharge || 0, taxRate, line.rateMode, line.discountPercent);
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
                    Discount %
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={line.discountPercent ?? 0}
                      disabled={!editable}
                      onChange={(e) => setServiceDiscount(line.id, e.target.value)}
                      onBlur={persistLaborCharge}
                      className="w-16 rounded-md border border-border bg-bg-raised px-2 py-1 text-right text-sm tabular-nums text-text disabled:opacity-60"
                    />
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
              const base = baseRateOf(line.unitPrice || 0, taxRate, line.rateMode, line.discountPercent);
              const lineTotal = (base + (!underWarranty && taxApply && !line.pending ? base * (taxRate / 100) : 0)) * qty;
              return (
                <div key={line.id} className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[10rem] flex-1">
                      <InlineTypeahead
                        placeholder="Part / service name"
                        value={line.materialLabel}
                        disabled={!editable || line.pending}
                        onChange={(v) => setPartLabel(line.id, v)}
                        onBlur={persistPartQty}
                        options={bomMaterialsState.map((m) => ({ value: m.id, label: m.label }))}
                        className="w-full rounded-md border border-border bg-bg-raised px-2 py-1.5 text-sm text-text disabled:opacity-60"
                      />
                      {/* Live Available Qty for the currently-selected material, so
                          staff can see before typing a Qty whether Stock can
                          actually cover it — same data source (getAvailabilityByMaterial)
                          the Inventory forms show in their own Material dropdowns. */}
                      {line.materialId && materialAvailability[line.materialId.split(" — ")[0].trim()] && (
                        <p className="mt-0.5 text-[11px] text-text-muted">
                          Avail: {materialAvailability[line.materialId.split(" — ")[0].trim()]}
                        </p>
                      )}
                      {line.materialId && !materialAvailability[line.materialId.split(" — ")[0].trim()] && (
                        <p className="mt-0.5 text-[11px] text-danger">No stock available for this part.</p>
                      )}
                    </div>
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
                      Rate (BOM)
                      <input
                        type="number"
                        readOnly
                        title="Set by the selected material's catalog rate — not hand-typed. Use Discount % to price below it."
                        value={line.unitPrice ?? 0}
                        className="w-24 cursor-not-allowed rounded-md border border-border bg-bg-sunken px-2 py-1 text-right text-sm tabular-nums text-text-muted"
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
                      Discount %
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={line.discountPercent ?? 0}
                        disabled={!editable || line.pending}
                        onChange={(e) => setPartDiscount(line.id, e.target.value)}
                        onBlur={persistPartQty}
                        className="w-16 rounded-md border border-border bg-bg-raised px-2 py-1 text-right text-sm tabular-nums text-text disabled:opacity-60"
                      />
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
                        Part Not Available
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
          plain Engineer Remark field, a Solution dropdown (selectSolution
          — a plain diagnosis field, not a billable line item) + Add
          button (for creating a new Solution catalog entry), a separate
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
                onChange={(e) => {
                  // Picking an existing Solution commits it immediately as
                  // a plain workorder field (selectSolution) -- NOT a
                  // billable ServiceLine. Previously this only stored the
                  // pick in a bare string and required a separate "+ Add
                  // Solution" click to register it (and that registration
                  // wrongly created a priced line item). "+ Add Solution"
                  // is now only for creating a brand-new Solution catalog
                  // entry, not for confirming an existing selection.
                  const value = e.target.value;
                  if (!value) {
                    setSolutionSelectValue("");
                    setSelectedSolutionLabel("");
                    persist({ solutionId: "", solutionLabel: "" });
                    return;
                  }
                  const option = solutionOptionsState.find((o) => o.value === value);
                  if (option) selectSolution(option);
                }}
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
                disabled={!editable || !addSolutionAction}
                onClick={() => {
                  setNewSolutionTitle("");
                  setAddSolutionError(null);
                  setAddSolutionOpen(true);
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
          <StaffNameField
            label="Engineer Name (prints on the closed job sheet)"
            value={engineer}
            onChange={setEngineer}
            onCommit={persistEngineerName}
            options={staffNameOptionsState}
            freeText={engineerFreeText}
            setFreeText={setEngineerFreeText}
            placeholder="Who repaired this device"
            disabled={!editable}
            onAddNew={addStaffNameAction ? () => openAddStaffName("engineer") : undefined}
          />
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

      {/* Read-only handover record — engineer/collected-by and payment mode
          are captured in the Close Workorder modal (confirmClose) but were
          never shown back anywhere once the workorder closed. */}
      {stage === "Closed" && !cancelled && (
        <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
          <h2 className="font-display text-base font-bold text-text">Handover Record</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Engineer / Serviced By</dt>
              <dd className="mt-0.5 text-text">{engineer || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Collected By</dt>
              <dd className="mt-0.5 text-text">{collectedBy || "—"}</dd>
            </div>
            {!underWarranty && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Mode of Payment</dt>
                <dd className="mt-0.5 text-text">{paymentMode || "—"}</dd>
              </div>
            )}
            {handoverNotes && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Handover Notes</dt>
                <dd className="mt-0.5 text-text">{handoverNotes}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

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
      {/* Part Not Available (PNA) — two real choices, not just a bare confirm:
          track it (creates a service-centre-pna record owner/staff can work
          from to go source the part, via createPnaAction) or drop the line
          entirely (closePnaLine). Brand Job No. is optional and only
          matters for the Track path. */}
      <Modal
        open={pendingLineId !== null}
        onClose={() => setPendingLineId(null)}
        title="Part Not Available"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setPendingLineId(null)} disabled={pnaSubmitting}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-outline text-danger"
              onClick={() => pendingLineId && closePnaLine(pendingLineId)}
              disabled={pnaSubmitting}
            >
              Close This Line
            </button>
            <button
              type="button"
              className="btn-accent disabled:opacity-50"
              onClick={() => pendingLineId && markPna(pendingLineId)}
              disabled={pnaSubmitting}
            >
              {pnaSubmitting ? "Saving…" : "Track as Part Not Available"}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          This part isn&apos;t available right now. Either track it so owner/staff can go source it (adds it to the
          PNA list, with the supplier reference below if you have one), or close this line if it&apos;s no longer
          needed on this job.
        </p>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Brand Job No. <span className="font-normal normal-case">(optional — the supplier&apos;s part-order reference)</span>
          <input
            type="text"
            value={pnaBrandJobNoDraft}
            onChange={(e) => setPnaBrandJobNoDraft(e.target.value)}
            placeholder="e.g. supplier order ref"
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text"
          />
        </label>
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
      {/* Mark Completed — IMEI/Serial No. wasn't captured at intake, so it's
          collected here, once, before the repair can be marked completed. */}
      <Modal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Mark Completed"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCompleteModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-accent disabled:opacity-50"
              onClick={confirmMarkCompleted}
              disabled={!imeiDraft.trim()}
            >
              Mark Completed
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          This device&apos;s IMEI/Serial No. wasn&apos;t recorded at intake. Enter it now before the repair can be marked completed.
        </p>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-text-muted">
          IMEI / Serial No.
          <input
            type="text"
            value={imeiDraft}
            onChange={(e) => setImeiDraft(e.target.value)}
            placeholder="Enter IMEI or Serial No."
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-text"
          />
        </label>
      </Modal>
      {/* Unlock Customer Data — same CustomerDataOtpGate the Customers
          list/detail pages show full-page, reused as-is here in a Modal
          since the rest of this page stays visible around it. */}
      <Modal open={contactUnlockOpen} onClose={() => setContactUnlockOpen(false)} title="Unlock Customer Data" size="sm">
        <CustomerDataOtpGate partnerId={partnerId} />
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
          All serialized parts are accounted for. Confirm who did the work, then record who handed the unit over
          and how payment was taken before closing this workorder.
          {!underWarranty && (
            <>
              {" "}Chargeable lines total <span className="font-semibold text-text">₹{estimateTotal}</span> before
              GST — the invoice is generated the moment this workorder closes, treated as paid in full at handover.
            </>
          )}
        </p>
        {/* Options come from the partner's own Staff Names roster when they
            keep one (Pro+) — a Starter partner (empty roster) gets a plain
            required text box instead, via StaffNameField. */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Engineer is already mandatory earlier, at Mark Completed — shown
              here for a final check/correction only, not re-required. */}
          <StaffNameField
            label="Engineer / Serviced By"
            value={engineer}
            onChange={setEngineer}
            options={staffNameOptionsState}
            freeText={engineerFreeText}
            setFreeText={setEngineerFreeText}
            placeholder="Who actually repaired this"
            onAddNew={addStaffNameAction ? () => openAddStaffName("engineer") : undefined}
          />
          <StaffNameField
            label="Collected By"
            required
            value={collectedBy}
            onChange={setCollectedBy}
            options={staffNameOptionsState}
            freeText={collectedByFreeText}
            setFreeText={setCollectedByFreeText}
            placeholder="Who handed it over / collected payment"
            onAddNew={addStaffNameAction ? () => openAddStaffName("collectedBy") : undefined}
          />
          {/* Payment, captured in this same close step now instead of a
              later separate "Create Invoice" modal — the invoice is
              generated atomically with the close (see confirmClose). A
              chargeable job is always treated as paid in full at handover
              (amount comes from the invoice total itself, not a typed
              figure) — Mode of Payment is the only thing to record. Nothing
              to collect on a warranty job, so the whole section is skipped
              for one, same as createInvoice's rule. */}
          {!underWarranty && (
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted sm:col-span-2">
              Mode of Payment
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
          )}
        </div>
        {staffNameOptionsState.length === 0 && (
          <p className="mt-2 text-xs text-text-muted">
            Type each name in full. Keeping a reusable Staff Names list (so these become pickable) is a Pro feature.
          </p>
        )}
      </Modal>
      {/* "+ Add Staff Name" quick-add — Pro+ only (addStaffNameAction is
          omitted entirely below Pro), mirrors the Add Brand/Model modal
          pattern above but with just the one required field. */}
      <Modal open={addStaffNameOpen} onClose={() => setAddStaffNameOpen(false)} title="Add Staff Name" size="sm">
        <div className="space-y-3">
          <label className="text-xs font-medium text-text-muted">
            Name
            <input
              autoFocus
              value={newStaffNameDraft}
              onChange={(e) => setNewStaffNameDraft(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              placeholder="e.g. Suresh M."
            />
          </label>
          {addStaffNameError && <p className="text-sm text-danger">{addStaffNameError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-outline" onClick={() => setAddStaffNameOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-accent"
              disabled={!newStaffNameDraft.trim() || addStaffNamePending}
              onClick={submitAddStaffName}
            >
              {addStaffNamePending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
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
    </div>
  );
}
