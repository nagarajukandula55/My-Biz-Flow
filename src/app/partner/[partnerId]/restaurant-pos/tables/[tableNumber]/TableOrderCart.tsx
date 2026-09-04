"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchSelectModal, type SearchSelectOption } from "@/components/SearchSelectModal";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { computeOrderTotals, type MenuItem, type RestaurantOrder } from "@/lib/sample-data/restaurant-pos";
import {
  addItemToOrderAction,
  cancelOrderAction,
  removeLineAction,
  sendToKitchenAction,
  settleBillAction,
  setCoversAction,
  updateLineQtyAction,
} from "../../actions";

const TENDER_METHODS = ["Cash", "UPI", "Card", "Wallet"];

export function TableOrderCart({
  partnerId,
  tableNumber,
  menuItems,
  order,
}: {
  partnerId: string;
  tableNumber: string;
  menuItems: MenuItem[];
  order: RestaurantOrder | null;
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [tenderMethod, setTenderMethod] = useState("Cash");
  const [splitCount, setSplitCount] = useState(1);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const options: SearchSelectOption[] = menuItems.map((m) => ({
    value: m.id,
    label: m.name,
    sublabel: `₹${m.price} · GST ${m.taxRate}% · ${m.category}`,
  }));

  const totals = order ? computeOrderTotals(order.lines) : { subtotal: 0, taxAmount: 0, totalAmount: 0 };
  const shareTotal = Math.round((totals.totalAmount / Math.max(1, splitCount)) * 100) / 100;
  const canSettle = !!order && order.lines.length > 0 && order.status !== "Billed" && order.status !== "Cancelled";
  const hasUnsentLines = !!order && order.lines.some((l) => !l.kotSent);

  function refresh() {
    router.refresh();
  }

  function addItem(option: SearchSelectOption) {
    setPickerOpen(false);
    startTransition(async () => {
      await addItemToOrderAction(partnerId, tableNumber, option.value);
      refresh();
    });
  }

  function changeQty(lineId: string, qty: number) {
    if (!order) return;
    startTransition(async () => {
      await updateLineQtyAction(partnerId, order.id, lineId, qty);
      refresh();
    });
  }

  function removeLine(lineId: string) {
    if (!order) return;
    startTransition(async () => {
      await removeLineAction(partnerId, order.id, lineId);
      refresh();
    });
  }

  function sendToKitchen() {
    if (!order) return;
    startTransition(async () => {
      await sendToKitchenAction(partnerId, order.id);
      refresh();
    });
  }

  function settleBill() {
    if (!order) return;
    setError(null);
    startTransition(async () => {
      try {
        await settleBillAction(partnerId, order.id, { tenderMethod, splitCount });
      } catch (e) {
        const digest = (e as { digest?: string } | undefined)?.digest;
        if (digest?.startsWith("NEXT_REDIRECT")) throw e;
        setError(e instanceof Error ? e.message : "Failed to settle bill");
      }
    });
  }

  function confirmCancel() {
    if (!order) return;
    startTransition(async () => {
      await cancelOrderAction(partnerId, order.id, cancelReason);
      setCancelOpen(false);
      router.push(`/partner/${partnerId}/restaurant-pos/tables`);
    });
  }

  function changeCovers(covers: number) {
    if (!order) return;
    startTransition(async () => {
      await setCoversAction(partnerId, order.id, covers);
      refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-md border border-border bg-bg-raised p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-text">Order</h2>
            <button type="button" className="btn-accent" onClick={() => setPickerOpen(true)} disabled={isPending}>
              + Add Item
            </button>
          </div>

          {!order || order.lines.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">No items yet — add a menu item to start this table's order.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {order.lines.map((line) => (
                <div key={line.id} className="rounded-md border border-border bg-bg px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-text">
                        {line.name} {line.kotSent && <StatusChip label="Sent to kitchen" variant="warning" className="ml-2" />}
                      </div>
                      <div className="text-xs text-text-muted">
                        ₹{line.unitPrice} · GST {line.taxRate}%
                      </div>
                    </div>
                    {!line.kotSent && (
                      <button type="button" className="text-xs text-danger hover:underline" onClick={() => removeLine(line.id)}>
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="h-7 w-7 rounded-md border border-border text-sm text-text disabled:opacity-40"
                        disabled={line.kotSent}
                        onClick={() => changeQty(line.id, Math.max(1, line.qty - 1))}
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm text-text">{line.qty}</span>
                      <button
                        type="button"
                        className="h-7 w-7 rounded-md border border-border text-sm text-text disabled:opacity-40"
                        disabled={line.kotSent}
                        onClick={() => changeQty(line.id, line.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="ml-auto text-sm font-semibold tabular-nums text-text">₹{line.qty * line.unitPrice}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {order && (
            <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
              Covers
              <input
                type="number"
                min={1}
                value={order.covers}
                onChange={(e) => changeCovers(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 rounded-md border border-border bg-bg-raised px-2 py-1 text-center text-sm text-text"
              />
            </div>
          )}

          {order && hasUnsentLines && (
            <button type="button" className="btn-outline mt-4 w-full" onClick={sendToKitchen} disabled={isPending}>
              Send to Kitchen
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="rounded-md border border-border bg-bg-raised p-4">
          <h2 className="font-display text-base font-bold text-text">Bill</h2>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal</span>
              <span className="tabular-nums">₹{totals.subtotal}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Tax</span>
              <span className="tabular-nums">₹{totals.taxAmount}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 text-base font-bold text-text">
              <span>Total</span>
              <span className="tabular-nums">₹{totals.totalAmount}</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-accent mt-4 w-full disabled:opacity-50"
            disabled={!canSettle || isPending}
            onClick={() => setBillOpen(true)}
          >
            Settle Bill
          </button>
          {order && order.status !== "Billed" && order.status !== "Cancelled" && (
            <button type="button" className="btn-outline mt-2 w-full text-danger" onClick={() => setCancelOpen(true)} disabled={isPending}>
              Cancel Order
            </button>
          )}
        </div>
      </div>

      <SearchSelectModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add Menu Item"
        options={options}
        onSelect={addItem}
        searchPlaceholder="Search menu…"
      />

      <Modal
        open={billOpen}
        onClose={() => setBillOpen(false)}
        title="Settle Bill"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setBillOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={settleBill} disabled={isPending}>
              {isPending ? "Settling…" : "Confirm & Settle"}
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <div>
            <label className="text-xs text-text-muted">Payment method</label>
            <select
              value={tenderMethod}
              onChange={(e) => setTenderMethod(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
            >
              {TENDER_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted">Split across covers</label>
            <input
              type="number"
              min={1}
              value={splitCount}
              onChange={(e) => setSplitCount(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
            />
            {splitCount > 1 && (
              <p className="mt-1 text-xs text-text-muted">
                {splitCount} invoices of ₹{shareTotal} each (total ₹{totals.totalAmount} divided evenly).
              </p>
            )}
          </div>
          {error && (
            <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-xs text-danger">{error}</div>
          )}
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Order"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCancelOpen(false)}>
              Back
            </button>
            <button type="button" className="btn-accent" onClick={confirmCancel} disabled={isPending}>
              {isPending ? "Cancelling…" : "Cancel Order"}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">This frees the table without creating a Billing invoice.</p>
        <input
          type="text"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Reason (optional)"
          className="mt-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </Modal>
    </div>
  );
}
