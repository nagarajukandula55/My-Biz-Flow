"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { MaterialLineItemsTable, type MaterialLineItem, type MaterialLineOption } from "@/components/MaterialLineItemsTable";
import { createStockTransferAction, createStockTransferMultiAction } from "./actions";

const OWN_TRANSFER_HEADER_KEYS = new Set(["transferDate", "reason"]);

export type ShipperInfo = { code: string; name: string; address: string } | null;

/**
 * Create-as-modal for inventory/stock-transfers. Two separate entry points,
 * matching the two genuinely different flows this module has always had
 * (see actions.ts's own doc comments) — kept as two distinct modals rather
 * than one conditional form, so the untouched partner-to-partner path
 * (Super Admin approval) keeps using its ORIGINAL single-line
 * RecordFormModal + createStockTransferAction exactly as before:
 *
 *  - "+ New Transfer" (primary): own-warehouse (intra-partner) transfer —
 *    multi-line (MaterialLineItemsTable: condition + unit price + serials
 *    per row, serialized materials derive Quantity from one barcode/serial
 *    per unit) and always created "Pending" — see createStockTransferMultiAction.
 *    Real stock only moves once the transfer's detail page confirms a
 *    Telegram OTP (Reconcile/Confirm panel). Shows the shipping partner's
 *    own SC code/name/address as a read-only header (who is raising this
 *    transfer), then a From Warehouse / To Warehouse pair managed here
 *    (not by the generic RecordForm) so the To Warehouse list can exclude
 *    whichever warehouse was picked as From.
 *  - "Transfer to another partner…" (secondary link): unchanged
 *    single-line partner-to-partner request, gated behind Super Admin
 *    approval — createStockTransferAction's partner-to-partner branch is
 *    untouched.
 */
export function StockTransfersNewButton({
  partnerId,
  fields,
  materialOptions,
  shipper,
}: {
  partnerId: string;
  fields: FormFieldDef[];
  materialOptions: MaterialLineOption[];
  shipper: ShipperInfo;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const [items, setItems] = useState<MaterialLineItem[]>([]);
  const [fromWarehouseName, setFromWarehouseName] = useState("");
  const [toWarehouseName, setToWarehouseName] = useState("");
  const { open: partnerOpen, openModal: openPartnerModal, closeModal: closePartnerModal } = useRecordFormModal();

  const ownHeaderFields = fields.filter((f) => OWN_TRANSFER_HEADER_KEYS.has(f.key));
  const warehouseField = fields.find((f) => f.key === "fromWarehouseName");
  const allWarehouses = warehouseField?.options ?? [];
  const toWarehouseOptions = allWarehouses.filter((w) => w !== fromWarehouseName);

  function resetOwnForm() {
    setItems([]);
    setFromWarehouseName("");
    setToWarehouseName("");
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-accent" onClick={() => setOwnOpen(true)}>
          + New Transfer
        </button>
        <button type="button" onClick={openPartnerModal} className="text-xs text-text-muted underline hover:text-accent">
          Transfer to another partner…
        </button>
      </div>

      <Modal
        open={ownOpen}
        onClose={() => {
          setOwnOpen(false);
          resetOwnForm();
        }}
        title="New Transfer (own warehouses)"
        size="lg"
      >
        {shipper && (
          <div className="mb-4 rounded-lg border border-border bg-bg-raised p-3 text-sm">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Shipper (raising this transfer)</h3>
            <p className="text-text">
              <span className="font-semibold">{shipper.code}</span> — {shipper.name}
            </p>
            {shipper.address && <p className="mt-0.5 text-xs text-text-muted">{shipper.address}</p>}
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Shipper Warehouse (From)</label>
            <select
              value={fromWarehouseName}
              onChange={(e) => {
                setFromWarehouseName(e.target.value);
                if (e.target.value === toWarehouseName) setToWarehouseName("");
              }}
              className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
            >
              <option value="">Select warehouse…</option>
              {allWarehouses.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Receiving Warehouse (To)</label>
            <select
              value={toWarehouseName}
              onChange={(e) => setToWarehouseName(e.target.value)}
              disabled={!fromWarehouseName}
              className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent disabled:opacity-50"
            >
              <option value="">{fromWarehouseName ? "Select warehouse…" : "Pick the Shipper Warehouse first"}</option>
              {toWarehouseOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 font-display text-sm font-bold text-text">Line items</h3>
          <p className="mb-2 text-xs text-text-muted">
            Add one row per material — a Serialized material requires one barcode/serial per unit (Quantity is
            derived from how many are entered). Moves only after the transfer is confirmed with a Telegram OTP on
            its detail page.
          </p>
          <MaterialLineItemsTable
            items={items}
            onChange={setItems}
            materialOptions={materialOptions}
            showSerials
            conditionOptions={["Good", "Defective"]}
            showUnitPrice
          />
        </div>
        <RecordForm
          fields={ownHeaderFields}
          submitLabel="Create Transfer"
          action={async (values) => {
            if (!fromWarehouseName || !toWarehouseName) {
              return { error: "Choose both a Shipper Warehouse and a Receiving Warehouse." };
            }
            if (items.length === 0) return { error: "Add at least one line item before creating the transfer." };
            const lines = items.map((it) => ({
              materialId: it.materialId,
              quantity: it.quantity,
              condition: it.condition ?? "Good",
              unitPrice: it.unitPrice ?? 0,
              serialNumbers: it.serialNumbers ?? "",
            }));
            return createStockTransferMultiAction(partnerId, { ...values, fromWarehouseName, toWarehouseName }, lines);
          }}
        />
      </Modal>

      <RecordFormModal
        open={partnerOpen}
        onClose={closePartnerModal}
        title="Transfer to another Partner"
        fields={fields}
        submitLabel="Request Transfer"
        action={createStockTransferAction.bind(null, partnerId)}
      />
    </>
  );
}
