"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { MaterialLineItemsTable, type MaterialLineItem, type MaterialLineOption } from "@/components/MaterialLineItemsTable";
import { createStockAdjustmentsMultiAction } from "./actions";

/** These move from the flat single form into a per-row line item (see
 * MaterialLineItemsTable) — Warehouse/Type/Reason/Adjusted By/Date stay
 * shared across every line in one submission. */
const LINE_FIELD_KEYS = new Set(["materialId", "quantity", "serialNumbers"]);

/**
 * Create-as-modal for inventory/stock-adjustments — supports one or many
 * line items in a single submission (see CLAUDE.md's multi-line request):
 * a shared header (Warehouse/Type/Reason/Adjusted By/Date, still rendered
 * by RecordForm exactly as before) plus an "add row" material table
 * (MaterialLineItemsTable, branching serialized-vs-not per row). Each line
 * becomes its own inventory-stock-adjustments BusinessRecord AND its own
 * real Stock delta on submit via createStockAdjustmentsMultiAction — same
 * effect per line as the original single-item flow, just looped.
 */
export function StockAdjustmentsNewButton({
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

  const headerFields = fields.filter((f) => !LINE_FIELD_KEYS.has(f.key));

  return (
    <>
      <button type="button" className="btn-accent" onClick={() => setOpen(true)}>
        + New Adjustment
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Adjustment" size="lg">
        <div className="mb-6">
          <h3 className="mb-2 font-display text-sm font-bold text-text">Line items</h3>
          <p className="mb-2 text-xs text-text-muted">
            Add one row per material — a Serialized material asks for its serial/barcode numbers instead of a typed
            quantity (quantity is derived from how many you enter).
          </p>
          <MaterialLineItemsTable items={items} onChange={setItems} materialOptions={materialOptions} showSerials />
        </div>
        <RecordForm
          fields={headerFields}
          submitLabel="Create Adjustment"
          action={async (values) => {
            if (items.length === 0) return { error: "Add at least one line item before creating the adjustment." };
            const lines = items.map((it) => ({
              materialId: it.materialId,
              quantity: it.quantity,
              serialNumbers: it.serialNumbers ?? "",
            }));
            return createStockAdjustmentsMultiAction(partnerId, values, lines);
          }}
        />
      </Modal>
    </>
  );
}
