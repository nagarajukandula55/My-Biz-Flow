"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { LEAD_STAGES, type LeadStage } from "@/lib/sample-data/real-estate";
import { scheduleSiteVisitAction, updateLeadStageAction } from "./actions";

const STAGE_VARIANT: Record<LeadStage, "neutral" | "warning" | "teal" | "success" | "danger"> = {
  New: "neutral",
  "Site Visit Scheduled": "warning",
  Negotiation: "teal",
  "Agreement Signed": "success",
  "Closed/Lost": "danger",
};

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RealEstateLifecycle({
  partnerId,
  listingId,
  initialStage,
  initialAgentId,
  initialAgentName,
  initialSiteVisitStart,
  initialSiteVisitEnd,
  initialDealValue,
  initialCommissionAmount,
  price,
}: {
  partnerId: string;
  listingId: string;
  initialStage: LeadStage;
  initialAgentId?: string;
  initialAgentName?: string;
  initialSiteVisitStart?: string;
  initialSiteVisitEnd?: string;
  initialDealValue?: number;
  initialCommissionAmount?: number;
  price?: number;
}) {
  const [stage, setStage] = useState<LeadStage>(initialStage);
  const [agentName, setAgentName] = useState(initialAgentName ?? "");
  const [visitStart, setVisitStart] = useState(toLocalInput(initialSiteVisitStart));
  const [visitEnd, setVisitEnd] = useState(toLocalInput(initialSiteVisitEnd));
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);
  const [closedLostModalOpen, setClosedLostModalOpen] = useState(false);
  const [dealValue, setDealValue] = useState(String(initialDealValue ?? price ?? ""));
  const [commissionPct, setCommissionPct] = useState("");
  const [closedLostReason, setClosedLostReason] = useState("");
  const [commissionAmount, setCommissionAmount] = useState(initialCommissionAmount);
  const [, startTransition] = useTransition();

  function saveVisit() {
    if (!agentName || !visitStart || !visitEnd) {
      setConflictMessage("Agent, start and end time are all required.");
      return;
    }
    startTransition(async () => {
      const startIso = new Date(visitStart).toISOString();
      const endIso = new Date(visitEnd).toISOString();
      const result = await scheduleSiteVisitAction(partnerId, listingId, agentName, agentName, startIso, endIso);
      if (!result.ok) {
        setConflictMessage(result.message ?? "Could not schedule this visit.");
        return;
      }
      setConflictMessage(null);
      setVisitModalOpen(false);
      if (stage === "New") setStage("Site Visit Scheduled");
    });
  }

  function advanceStage() {
    const idx = LEAD_STAGES.indexOf(stage);
    const next = LEAD_STAGES[idx + 1];
    if (!next) return;
    if (next === "Agreement Signed") {
      setAgreementModalOpen(true);
      return;
    }
    startTransition(async () => {
      await updateLeadStageAction(partnerId, listingId, next);
      setStage(next);
    });
  }

  function confirmAgreement() {
    const dv = Number(dealValue);
    const cp = Number(commissionPct);
    if (!dv || dv <= 0 || !cp || cp <= 0) {
      setConflictMessage("Deal value and commission % are both required.");
      return;
    }
    startTransition(async () => {
      const result = await updateLeadStageAction(partnerId, listingId, "Agreement Signed", {
        dealValue: dv,
        commissionPct: cp,
      });
      if (!result.ok) {
        setConflictMessage(result.message ?? "Could not update stage.");
        return;
      }
      setCommissionAmount(Math.round((dv * cp) / 100));
      setStage("Agreement Signed");
      setAgreementModalOpen(false);
      setConflictMessage(null);
    });
  }

  function markClosedLost() {
    startTransition(async () => {
      await updateLeadStageAction(partnerId, listingId, "Closed/Lost", { closedLostReason });
      setStage("Closed/Lost");
      setClosedLostModalOpen(false);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {LEAD_STAGES.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <StatusChip label={s} variant={s === stage ? STAGE_VARIANT[s] : "neutral"} />
            {i < LEAD_STAGES.length - 1 && <span className="text-text-muted">&rarr;</span>}
          </div>
        ))}
      </div>

      {conflictMessage && (
        <div className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {conflictMessage}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setVisitModalOpen(true)}
          className="rounded-md border border-border bg-bg-raised px-3 py-2 text-left text-sm"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Site Visit</div>
          <div className="mt-0.5 text-text">
            {agentName ? `${agentName} — ${visitStart ? new Date(visitStart).toLocaleString() : "not scheduled"}` : "Schedule a site visit"}
          </div>
        </button>
        {commissionAmount !== undefined && (
          <div className="rounded-md border border-border bg-bg-raised px-3 py-2 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Commission</div>
            <div className="mt-0.5 text-text">₹{commissionAmount}</div>
          </div>
        )}
      </div>

      {stage !== "Closed/Lost" && (
        <div className="mt-6 flex items-center gap-3">
          <button type="button" className="btn-accent" onClick={advanceStage}>
            {stage === "New" && "Schedule Site Visit"}
            {stage === "Site Visit Scheduled" && "Move to Negotiation"}
            {stage === "Negotiation" && "Mark Agreement Signed"}
            {stage === "Agreement Signed" && "Close Deal"}
          </button>
          <button type="button" className="btn-outline text-danger" onClick={() => setClosedLostModalOpen(true)}>
            Mark Closed/Lost
          </button>
        </div>
      )}

      <Modal
        open={visitModalOpen}
        onClose={() => setVisitModalOpen(false)}
        title="Schedule Site Visit"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setVisitModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={saveVisit}>
              Save
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Agent</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              placeholder="Agent name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Start</label>
            <input
              type="datetime-local"
              value={visitStart}
              onChange={(e) => setVisitStart(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">End</label>
            <input
              type="datetime-local"
              value={visitEnd}
              onChange={(e) => setVisitEnd(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={agreementModalOpen}
        onClose={() => setAgreementModalOpen(false)}
        title="Agreement Signed — Commission"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setAgreementModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={confirmAgreement}>
              Confirm
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Deal Value (₹)</label>
            <input
              type="number"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Commission %</label>
            <input
              type="number"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          {Number(dealValue) > 0 && Number(commissionPct) > 0 && (
            <p className="text-sm text-text-muted">
              Commission amount: <span className="font-semibold text-text">₹{Math.round((Number(dealValue) * Number(commissionPct)) / 100)}</span>{" "}
              (computed server-side on confirm)
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={closedLostModalOpen}
        onClose={() => setClosedLostModalOpen(false)}
        title="Mark Closed/Lost"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setClosedLostModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={markClosedLost}>
              Confirm
            </button>
          </>
        }
      >
        <textarea
          value={closedLostReason}
          onChange={(e) => setClosedLostReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          rows={3}
        />
      </Modal>
    </div>
  );
}
