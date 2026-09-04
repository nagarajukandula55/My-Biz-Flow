"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import {
  MATTER_STAGES,
  computeTimeLogTotal,
  isCourtDateApproaching,
  type MatterStage,
  type TimeLogEntry,
} from "@/lib/sample-data/legal";
import { logHoursAction, setMatterStageAction, createInvoiceFromMatterAction } from "./actions";

const STAGE_VARIANT: Record<MatterStage, "neutral" | "warning" | "teal" | "success" | "amber"> = {
  New: "neutral",
  Discovery: "warning",
  Filing: "amber",
  Hearing: "teal",
  Resolved: "success",
};

export function MatterLifecycle({
  partnerId,
  matterId,
  initialStage,
  initialTimeLog,
  defaultRate,
  courtDate,
  invoiceId,
}: {
  partnerId: string;
  matterId: string;
  initialStage: MatterStage;
  initialTimeLog: TimeLogEntry[];
  defaultRate: number;
  courtDate?: string | null;
  invoiceId?: string;
}) {
  const [stage, setStage] = useState<MatterStage>(initialStage);
  const [timeLog, setTimeLog] = useState<TimeLogEntry[]>(initialTimeLog);
  const [invoice, setInvoice] = useState(invoiceId);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [rate, setRate] = useState(String(defaultRate || ""));
  const [, startTransition] = useTransition();

  const total = computeTimeLogTotal(timeLog);
  const totalHours = timeLog.reduce((s, e) => s + (Number(e.hours) || 0), 0);
  const approaching = isCourtDateApproaching(courtDate);
  const stageIdx = MATTER_STAGES.indexOf(stage);

  function advanceStage() {
    const next = MATTER_STAGES[stageIdx + 1];
    if (!next) return;
    setStage(next);
    startTransition(async () => {
      await setMatterStageAction(partnerId, matterId, next);
      if (next === "Resolved") setInvoice("pending");
    });
  }

  function submitHours() {
    const h = Number(hours);
    const r = Number(rate) || defaultRate || 0;
    if (!h || h <= 0 || !description.trim()) return;
    const entry: TimeLogEntry = { id: `TL-${Date.now()}`, date, hours: h, description: description.trim(), rate: r };
    setTimeLog((prev) => [...prev, entry]);
    setLogModalOpen(false);
    setHours("");
    setDescription("");
    startTransition(async () => {
      await logHoursAction(partnerId, matterId, { date, hours: h, description: entry.description, rate: r });
    });
  }

  function generateInvoice() {
    setInvoice("pending");
    startTransition(async () => {
      await createInvoiceFromMatterAction(partnerId, matterId);
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      {/* Stage stepper */}
      <div className="flex flex-wrap items-center gap-2">
        {MATTER_STAGES.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <StatusChip label={s} variant={s === stage ? STAGE_VARIANT[s] : "neutral"} />
            {i < MATTER_STAGES.length - 1 && <span className="text-text-muted">&rarr;</span>}
          </div>
        ))}
      </div>

      {approaching && (
        <div className="mt-3">
          <StatusChip label={`Court date approaching — ${courtDate}`} variant="danger" />
        </div>
      )}

      {/* Billable hours */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-text">Billable Hours</h2>
          <p className="mt-1 text-sm text-text-muted">
            <span className="font-semibold text-text">{totalHours}h</span> logged — running total{" "}
            <span className="font-semibold text-text">₹{total.toLocaleString()}</span>
          </p>
        </div>
        <button type="button" className="btn-outline" onClick={() => setLogModalOpen(true)}>
          + Log Hours
        </button>
      </div>

      {timeLog.length > 0 && (
        <div className="mt-3 space-y-2">
          {timeLog.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm">
              <div>
                <span className="font-semibold text-text">{e.description}</span>
                <span className="ml-2 text-xs text-text-muted">{e.date}</span>
              </div>
              <span className="tabular-nums text-text-muted">
                {e.hours}h @ ₹{e.rate}/hr = ₹{(e.hours * e.rate).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Stage & invoice actions */}
      <div className="mt-6 flex items-center gap-3">
        {stage !== "Resolved" && (
          <button type="button" className="btn-accent" onClick={advanceStage}>
            Advance to {MATTER_STAGES[stageIdx + 1]}
          </button>
        )}
        {!invoice && (
          <button type="button" className="btn-outline" onClick={generateInvoice}>
            Generate Invoice
          </button>
        )}
        {invoice && invoice !== "pending" && (
          <span className="text-sm text-text-muted">Invoiced: {invoice}</span>
        )}
      </div>

      <Modal
        open={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        title="Log Hours"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setLogModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={submitHours}>
              Log Hours
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Hours</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Rate (₹/hr)</label>
            <input
              type="number"
              min={0}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
