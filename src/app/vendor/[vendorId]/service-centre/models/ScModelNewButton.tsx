"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { scModelFormFields } from "@/lib/sample-data/service-centre-models";

export function ScModelNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Model
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Model"
        fields={scModelFormFields}
        submitLabel="Create Model"
      />
    </>
  );
}
