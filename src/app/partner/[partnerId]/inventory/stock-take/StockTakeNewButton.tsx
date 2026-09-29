"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { MaterialLineItemsTable, type MaterialLineItem, type MaterialLineOption } from "@/components/MaterialLineItemsTable";
import { createStockTakeMultiAction, getExpectedQtyAction } from "./actions";

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
  // Mirrors RecordForm's own header values (Warehouse in particular) so the
  // line-items table above it — rendered outside RecordForm — can look up
  // each row's live Expected Qty for the currently-picked warehouse.
  const [headerValues, setHeaderValues] = useState<Record<string, unknown>>({});
  const warehouseName = String(headerValues["warehouseName"] ?? "").trim();

  // Rows are typically added BEFORE Warehouse is picked (line items sit
  // above the header form in this layout), so a plain per-row lookup on
  // material change alone would miss them. Once a warehouse is picked/
  // changed, refresh Expected Qty for every row already on the table too.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const lastWarehouseRef = useRef("");
  useEffect(() => {
    if (!warehouseName || warehouseName === lastWarehouseRef.current) return;
    lastWarehouseRef.current = warehouseName;
    const current = itemsRef.current;
    current.forEach((item, idx) => {
      if (!item.materialId.trim()) return;
      void getExpectedQtyAction(partnerId, item.materialId, warehouseName, item.condition).then((qty) => {
        const latest = itemsRef.current;
        if (idx >= latest.length || latest[idx].materialId !== item.materialId) return;
        setItems(latest.map((it, i) => (i === idx ? { ...it, expectedQty: qty } : it)));
      });
    });
  }, [warehouseName, partnerId]);

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
            onLookupExpectedQty={async (materialId, condition) => {
              if (!warehouseName) return undefined;
              return getExpectedQtyAction(partnerId, materialId, warehouseName, condition);
            }}
          />
        </div>
        <RecordForm
          fields={fields}
          submitLabel="Save Count"
          onValuesChange={setHeaderValues}
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
