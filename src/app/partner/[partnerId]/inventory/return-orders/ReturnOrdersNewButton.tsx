"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { MaterialLineItemsTable, type MaterialLineItem, type MaterialLineOption } from "@/components/MaterialLineItemsTable";
import { createReturnOrdersMultiAction } from "./actions";

/** These three fields move from the single flat form into a per-row line
 * item (see MaterialLineItemsTable) — everything else (Direction, Workorder,
 * Source/Destination, Vendor/Challan, Status, Created Date) is shared
 * across every line in one submission ("common" fields, unchanged from the
 * plain single-line form this replaces). */
const LINE_FIELD_KEYS = new Set(["returnType", "materialId", "quantity", "unitPrice"]);

/**
 * Create-as-modal for inventory/return-orders — supports one or many line
 * items in a single Return Order submission (see CLAUDE.md's multi-line
 * request): a shared header (Direction/Workorder/Source/Destination/
 * Vendor/Challan/Status/Created Date, still rendered by RecordForm exactly
 * as before) plus an "add row" material table (MaterialLineItemsTable).
 * Each line becomes its own inventory-return-orders BusinessRecord on
 * submit via createReturnOrdersMultiAction — same real Stock effect per
 * line as the original single-item flow, just looped.
 */
export function ReturnOrdersNewButton({
  partnerId,
  fields,
  materialOptions,
  availabilityLabels,
}: {
  partnerId: string;
  fields: FormFieldDef[];
  materialOptions: MaterialLineOption[];
  availabilityLabels: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MaterialLineItem[]>([]);

  const headerFields = fields.filter((f) => !LINE_FIELD_KEYS.has(f.key));

  return (
    <>
      <button type="button" className="btn-accent" onClick={() => setOpen(true)}>
        + New Return Order
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Return Order" size="lg">
        <div className="mb-6">
          <h3 className="mb-2 font-display text-sm font-bold text-text">Line items</h3>
          <p className="mb-2 text-xs text-text-muted">
            Add one row per material — one Return Order can cover a single item or several.
          </p>
          <MaterialLineItemsTable
            items={items}
            onChange={setItems}
            materialOptions={materialOptions}
            returnTypeOptions={["Defective", "Good"]}
            availabilityLabels={availabilityLabels}
            showUnitPrice
          />
        </div>
        <RecordForm
          fields={headerFields}
          submitLabel="Create Return Order"
          action={async (values) => {
            if (items.length === 0) return { error: "Add at least one line item before creating the Return Order." };
            const lines = items.map((it) => ({
              materialId: it.materialId,
              quantity: it.quantity,
              unitPrice: it.unitPrice ?? 0,
              returnType: it.returnType ?? "Good",
            }));
            return createReturnOrdersMultiAction(partnerId, values, lines);
          }}
        />
      </Modal>
    </>
  );
}
