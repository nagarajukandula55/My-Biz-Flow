"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { MaterialLineItemsTable, type MaterialLineItem, type MaterialLineOption } from "@/components/MaterialLineItemsTable";
import { createStockTransferAction, createStockTransferMultiAction } from "./actions";

const OWN_TRANSFER_HEADER_KEYS = new Set(["fromWarehouseName", "toWarehouseName", "transferDate", "reason"]);

/**
 * Create-as-modal for inventory/stock-transfers. Two separate entry points,
 * matching the two genuinely different flows this module has always had
 * (see actions.ts's own doc comments) — kept as two distinct modals rather
 * than one conditional form, so the untouched partner-to-partner path
 * (Super Admin approval) keeps using its ORIGINAL single-line
 * RecordFormModal + createStockTransferAction exactly as before:
 *
 *  - "+ New Transfer" (primary): own-warehouse (intra-partner) transfer —
 *    now multi-line (MaterialLineItemsTable, same pattern
 *    StockAdjustmentsNewButton uses, condition + unit price + serials per
 *    row) and always created "Pending" — see createStockTransferMultiAction.
 *    Real stock only moves once the transfer's detail page confirms a
 *    Telegram OTP (Reconcile/Confirm panel).
 *  - "Transfer to another partner…" (secondary link): unchanged
 *    single-line partner-to-partner request, gated behind Super Admin
 *    approval — createStockTransferAction's partner-to-partner branch is
 *    untouched.
 */
export function StockTransfersNewButton({
  partnerId,
  fields,
  materialOptions,
}: {
  partnerId: string;
  fields: FormFieldDef[];
  materialOptions: MaterialLineOption[];
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const [items, setItems] = useState<MaterialLineItem[]>([]);
  const { open: partnerOpen, openModal: openPartnerModal, closeModal: closePartnerModal } = useRecordFormModal();

  const ownHeaderFields = fields.filter((f) => OWN_TRANSFER_HEADER_KEYS.has(f.key));

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

      <Modal open={ownOpen} onClose={() => setOwnOpen(false)} title="New Transfer (own warehouses)" size="lg">
        <div className="mb-6">
          <h3 className="mb-2 font-display text-sm font-bold text-text">Line items</h3>
          <p className="mb-2 text-xs text-text-muted">
            Add one row per material — moves only after the transfer is confirmed with a Telegram OTP on its detail
            page.
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
            if (items.length === 0) return { error: "Add at least one line item before creating the transfer." };
            const lines = items.map((it) => ({
              materialId: it.materialId,
              quantity: it.quantity,
              condition: it.condition ?? "Good",
              unitPrice: it.unitPrice ?? 0,
              serialNumbers: it.serialNumbers ?? "",
            }));
            return createStockTransferMultiAction(partnerId, values, lines);
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
