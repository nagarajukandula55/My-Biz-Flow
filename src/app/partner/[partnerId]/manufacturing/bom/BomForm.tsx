"use client";

import { useState } from "react";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { MaterialLineItemsTable, type MaterialLineItem, type MaterialLineOption } from "@/components/MaterialLineItemsTable";
import type { BomLineInput } from "@/lib/manufacturing";

const HEADER_FIELDS: FormFieldDef[] = [
  { key: "productName", label: "Product Name", type: "text", required: true },
  { key: "productCode", label: "Product Code", type: "text", required: false },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

/** Shared create/edit form for a BillOfMaterial — header fields via RecordForm, material lines via the shared MaterialLineItemsTable (same "add row" pattern Return Orders/Stock Adjustments use, see CLAUDE.md). */
export function BomForm({
  materialOptions,
  initialValues,
  initialLines,
  submitLabel,
  action,
}: {
  materialOptions: MaterialLineOption[];
  initialValues?: Record<string, unknown>;
  initialLines?: MaterialLineItem[];
  submitLabel: string;
  action: (values: Record<string, unknown>, lines: BomLineInput[]) => Promise<void | { error?: string }>;
}) {
  const [items, setItems] = useState<MaterialLineItem[]>(initialLines ?? []);

  function materialLabelFor(materialId: string): string {
    return materialOptions.find((o) => o.value === materialId)?.label ?? materialId;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-2 font-display text-base font-bold text-text">BOM lines</h2>
        <p className="mb-2 text-xs text-text-muted">
          Add one row per raw material this product consumes — quantity is the total needed for one production run.
        </p>
        <MaterialLineItemsTable items={items} onChange={setItems} materialOptions={materialOptions} showUnitPrice />
      </div>
      <RecordForm
        fields={HEADER_FIELDS}
        initialValues={initialValues}
        submitLabel={submitLabel}
        action={async (values) => {
          if (items.length === 0) return { error: "Add at least one BOM line before saving." };
          const lines: BomLineInput[] = items.map((it) => ({
            materialId: it.materialId.split(" — ")[0]?.trim() || it.materialId,
            materialLabel: materialLabelFor(it.materialId),
            quantity: it.quantity,
            unitCost: Math.round((it.unitPrice ?? 0) * 100),
          }));
          return action(values, lines);
        }}
      />
    </div>
  );
}
