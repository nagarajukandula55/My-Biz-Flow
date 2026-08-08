"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { returnOrderFormFields } from "@/lib/sample-data/warehouse";

/** Create-as-modal for inventory/return-orders (see src/components/RecordFormModal.tsx). */
export function ReturnOrdersNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Return Order
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Return Order"
        fields={returnOrderFormFields}
        submitLabel="Create Return Order"
      />
    </>
  );
}
