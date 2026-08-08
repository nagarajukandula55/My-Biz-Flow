"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { partOrderFormFields } from "@/lib/sample-data/warehouse";

/** Create-as-modal for inventory/part-orders (see src/components/RecordFormModal.tsx). */
export function PartOrdersNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Part Order
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Part Order"
        fields={partOrderFormFields}
        submitLabel="Create Part Order"
      />
    </>
  );
}
