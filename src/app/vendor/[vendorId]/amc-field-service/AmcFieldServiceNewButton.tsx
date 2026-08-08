"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { amcFieldServiceFormFields } from "@/lib/sample-data/amc-field-service";

/** Create-as-modal for amc-field-service (see src/components/RecordFormModal.tsx). */
export function AmcFieldServiceNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Contract
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Contract"
        fields={amcFieldServiceFormFields}
        submitLabel="Create Contract"
      />
    </>
  );
}
