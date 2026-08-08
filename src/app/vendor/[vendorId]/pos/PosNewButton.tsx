"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { posFormFields } from "@/lib/sample-data/pos";

/** Create-as-modal for pos (see src/components/RecordFormModal.tsx). */
export function PosNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Sale
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Sale"
        fields={posFormFields}
        submitLabel="Create Sale"
      />
    </>
  );
}
