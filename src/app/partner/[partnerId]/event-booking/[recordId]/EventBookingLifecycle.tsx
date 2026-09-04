"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import type { ChecklistItem } from "@/lib/sample-data/event-booking";
import { setPaymentScheduleAction, recordEventPaymentAction, updateChecklistAction } from "./actions";

export function EventBookingLifecycle({
  partnerId,
  eventId,
  initialTotalCost,
  initialDepositAmount,
  initialDepositDueDate,
  initialDepositPaid,
  initialBalanceAmount,
  initialBalanceDueDate,
  initialBalancePaid,
  initialChecklist,
}: {
  partnerId: string;
  eventId: string;
  initialTotalCost?: number;
  initialDepositAmount?: number;
  initialDepositDueDate?: string;
  initialDepositPaid?: boolean;
  initialBalanceAmount?: number;
  initialBalanceDueDate?: string;
  initialBalancePaid?: boolean;
  initialChecklist: ChecklistItem[];
}) {
  const [totalCost, setTotalCost] = useState(String(initialTotalCost ?? ""));
  const [depositAmount, setDepositAmount] = useState(String(initialDepositAmount ?? ""));
  const [depositDueDate, setDepositDueDate] = useState(initialDepositDueDate ?? "");
  const [balanceDueDate, setBalanceDueDate] = useState(initialBalanceDueDate ?? "");
  const [balanceAmount, setBalanceAmount] = useState(initialBalanceAmount);
  const [depositPaid, setDepositPaid] = useState(Boolean(initialDepositPaid));
  const [balancePaid, setBalancePaid] = useState(Boolean(initialBalancePaid));
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [newItem, setNewItem] = useState("");
  const [newAssigned, setNewAssigned] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function saveSchedule() {
    const tc = Number(totalCost);
    const da = Number(depositAmount);
    if (!tc || tc <= 0) {
      setError("Total cost must be greater than zero.");
      return;
    }
    if (da < 0 || da > tc) {
      setError("Deposit amount must be between 0 and the total cost.");
      return;
    }
    startTransition(async () => {
      const result = await setPaymentScheduleAction(partnerId, eventId, tc, da, depositDueDate, balanceDueDate);
      if (!result.ok) {
        setError(result.message ?? "Could not save the schedule.");
        return;
      }
      setBalanceAmount(Math.max(0, tc - da));
      setScheduleModalOpen(false);
      setError(null);
    });
  }

  function recordPayment(installment: "deposit" | "balance") {
    startTransition(async () => {
      const result = await recordEventPaymentAction(partnerId, eventId, installment);
      if (!result.ok) {
        setError(result.message ?? "Could not record this payment.");
        return;
      }
      if (installment === "deposit") setDepositPaid(true);
      else setBalancePaid(true);
      setError(null);
    });
  }

  function addChecklistItem() {
    if (!newItem.trim()) return;
    const optimistic: ChecklistItem = { id: `CHK-pending-${Date.now()}`, item: newItem, assigned: newAssigned, done: false };
    setChecklist((prev) => [...prev, optimistic]);
    setNewItem("");
    setNewAssigned("");
    startTransition(async () => {
      await updateChecklistAction(partnerId, eventId, "add", { item: optimistic.item, assigned: optimistic.assigned });
    });
  }

  function toggleChecklistItem(itemId: string) {
    setChecklist((prev) => prev.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)));
    startTransition(async () => {
      await updateChecklistAction(partnerId, eventId, "toggle", { itemId });
    });
  }

  function removeChecklistItem(itemId: string) {
    setChecklist((prev) => prev.filter((c) => c.id !== itemId));
    startTransition(async () => {
      await updateChecklistAction(partnerId, eventId, "remove", { itemId });
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Payment schedule */}
      <div className="rounded-md border border-border bg-bg-raised p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-text">Payment Schedule</h2>
          <button type="button" className="btn-outline text-xs" onClick={() => setScheduleModalOpen(true)}>
            {initialTotalCost ? "Edit Schedule" : "Set Schedule"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Deposit</div>
                <div className="mt-0.5 text-text">
                  ₹{depositAmount || 0} {depositDueDate && `— due ${depositDueDate}`}
                </div>
              </div>
              {depositPaid ? (
                <StatusChip label="Paid" variant="success" />
              ) : (
                Number(depositAmount) > 0 && (
                  <button type="button" className="btn-outline text-xs" onClick={() => recordPayment("deposit")}>
                    Record Payment
                  </button>
                )
              )}
            </div>
          </div>
          <div className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Balance</div>
                <div className="mt-0.5 text-text">
                  ₹{balanceAmount ?? 0} {balanceDueDate && `— due ${balanceDueDate}`}
                </div>
              </div>
              {balancePaid ? (
                <StatusChip label="Paid" variant="success" />
              ) : (
                (balanceAmount ?? 0) > 0 && (
                  <button type="button" className="btn-outline text-xs" onClick={() => recordPayment("balance")}>
                    Record Payment
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vendor / catering checklist */}
      <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-base font-bold text-text">Vendor / Catering Checklist</h2>
        {checklist.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No checklist items yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {checklist.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={c.done} onChange={() => toggleChecklistItem(c.id)} />
                  <span className={c.done ? "text-text-muted line-through" : "text-text"}>{c.item}</span>
                  {c.assigned && <span className="text-xs text-text-muted">({c.assigned})</span>}
                </label>
                <button type="button" className="text-xs text-danger hover:underline" onClick={() => removeChecklistItem(c.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Item (e.g. Catering — Starters)"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            className="flex-1 rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
          />
          <input
            type="text"
            placeholder="Assigned to (optional)"
            value={newAssigned}
            onChange={(e) => setNewAssigned(e.target.value)}
            className="w-48 rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
          />
          <button type="button" className="btn-outline text-xs" onClick={addChecklistItem}>
            + Add Item
          </button>
        </div>
      </div>

      <Modal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Payment Schedule"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={saveSchedule}>
              Save
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Total Cost (₹)</label>
            <input
              type="number"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Deposit Amount (₹)</label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Deposit Due Date</label>
            <input
              type="date"
              value={depositDueDate}
              onChange={(e) => setDepositDueDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Balance Due Date</label>
            <input
              type="date"
              value={balanceDueDate}
              onChange={(e) => setBalanceDueDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          {Number(totalCost) > 0 && (
            <p className="text-sm text-text-muted">
              Balance amount: <span className="font-semibold text-text">₹{Math.max(0, Number(totalCost) - (Number(depositAmount) || 0))}</span>{" "}
              (computed server-side on save)
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
