"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { MaterialLineItemsTable, type MaterialLineItem, type MaterialLineOption } from "@/components/MaterialLineItemsTable";
import { createStockTakeMultiAction } from "./actions";

/**
 * Create-as-modal for inventory/stock-take — a shared header (Warehouse,
 * Counted Date, Counted By, Note, still rendered by RecordForm) plus an
 * "add row" material table (MaterialLineItemsTable, same pattern
 * StockAdjustmentsNewButton uses) for Material/Expected Qty/Counted Qty/
 * Material Type/Unit Price/Serials. The whole submission becomes ONE
 * "inventory-stock-take" BusinessRecord (a document with an embedded
 * lineItems array), always starting "Pending" — never applied to real
 * Stock here; see the record's own detail page for the OTP-gated
 * Reconcile action that actually applies it.
 */
export function StockTakeNewButton({
  partnerId,
  fields,
  materialOptions,
}: {
  partnerId: string;
  fields: FormFieldDef[];
  materialOptions: MaterialLineOption[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MaterialLineItem[]>([]);

  return (
    <>
      <button type="button" className="btn-accent" onClick={() => setOpen(true)}>
        + New Stock Take
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Stock Take" size="lg">
        <div className="mb-6">
          <h3 className="mb-2 font-display text-sm font-bold text-text">Line items</h3>
          <p className="mb-2 text-xs text-text-muted">
            Add one row per counted material — Expected Qty is the system's current figure, Counted Qty is the
            physical count, and Variance is computed automatically.
          </p>
          <MaterialLineItemsTable
            items={items}
            onChange={setItems}
            materialOptions={materialOptions}
            showSerials
            conditionOptions={["Good", "Defective"]}
            showUnitPrice
            stockTakeMode
          />
        </div>
        <RecordForm
          fields={fields}
          submitLabel="Save Count"
          action={async (values) => {
            if (items.length === 0) return { error: "Add at least one line item before saving the count." };
            const lines = items.map((it) => ({
              materialId: it.materialId,
              expectedQty: it.expectedQty ?? 0,
              countedQty: it.quantity,
              condition: it.condition ?? "Good",
              unitPrice: it.unitPrice ?? 0,
              serialNumbers: it.serialNumbers ?? "",
            }));
            return createStockTakeMultiAction(partnerId, values, lines);
          }}
        />
      </Modal>
    </>
  );
}
