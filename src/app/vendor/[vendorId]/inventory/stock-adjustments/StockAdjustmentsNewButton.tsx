"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { stockAdjustmentFormFields } from "@/lib/sample-data/warehouse";

/** Create-as-modal for inventory/stock-adjustments (see src/components/RecordFormModal.tsx). */
export function StockAdjustmentsNewButton() {
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
        fields={stockAdjustmentFormFields}
        submitLabel="Create Adjustment"
      />
    </>
  );
}
