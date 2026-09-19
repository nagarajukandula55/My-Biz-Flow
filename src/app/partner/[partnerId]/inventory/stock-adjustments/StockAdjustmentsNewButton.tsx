"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createStockAdjustmentAction } from "./actions";
import type { FormFieldDef } from "@/components/RecordForm";

/**
 * Create-as-modal for inventory/stock-adjustments (see
 * src/components/RecordFormModal.tsx). `fields` is fetched server-side by
 * the parent page (getStockAdjustmentFormFields, partner-scoped) and
 * passed in — this is a Client Component, so it can't call that async
 * function itself.
 */
export function StockAdjustmentsNewButton({ partnerId, fields }: { partnerId: string; fields: FormFieldDef[] }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Adjustment
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Adjustment"
        fields={fields}
        submitLabel="Create Adjustment"
        action={createStockAdjustmentAction.bind(null, partnerId)}
      />
    </>
  );
}
