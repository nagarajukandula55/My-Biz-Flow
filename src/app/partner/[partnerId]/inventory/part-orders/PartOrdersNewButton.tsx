"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { MaterialLineItemsTable, type MaterialLineItem, type MaterialLineOption } from "@/components/MaterialLineItemsTable";
import { createPartOrdersMultiAction } from "./actions";

/** These move from the flat single form into a per-row line item (see
 * MaterialLineItemsTable) — Linked Return Order/Source Warehouse/
 * Destination Location/Status/Dispatched Date stay shared across every
 * line in one submission. */
const LINE_FIELD_KEYS = new Set(["materialId", "quantity", "unitPrice", "serialNumbers"]);

/**
 * Create-as-modal for inventory/part-orders — supports one or many line
 * items in a single submission, matching the "add row" pattern Return
 * Orders/Stock Adjustments already use (see CLAUDE.md's multi-line
 * request): a shared header (still rendered by RecordForm exactly as
 * before) plus an "add row" material table (MaterialLineItemsTable,
 * branching serialized-vs-not per row, with Unit Price for the Inventory
 * ledger). Each line becomes its own inventory-part-orders BusinessRecord
 * and its own real Stock deduction on submit via createPartOrdersMultiAction
 * — same effect per line as the original single-item flow, just looped.
 */
export function PartOrdersNewButton({
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
        + New Part Order
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Part Order" size="lg">
        <div className="mb-6">
          <h3 className="mb-2 font-display text-sm font-bold text-text">Line items</h3>
          <p className="mb-2 text-xs text-text-muted">
            Add one row per material — a Serialized material asks for its serial/barcode numbers once Status is
            Dispatched or Delivered (quantity is derived from how many you enter).
          </p>
          <MaterialLineItemsTable items={items} onChange={setItems} materialOptions={materialOptions} showSerials showUnitPrice />
        </div>
        <RecordForm
          fields={headerFields}
          submitLabel="Create Part Order"
          action={async (values) => {
            if (items.length === 0) return { error: "Add at least one line item before creating the Part Order." };
            const lines = items.map((it) => ({
              materialId: it.materialId,
              quantity: it.quantity,
              unitPrice: it.unitPrice ?? 0,
              serialNumbers: it.serialNumbers ?? "",
            }));
            return createPartOrdersMultiAction(partnerId, values, lines);
          }}
        />
      </Modal>
    </>
  );
}
