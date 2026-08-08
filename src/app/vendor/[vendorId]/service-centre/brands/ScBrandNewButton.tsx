"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { scBrandFormFields } from "@/lib/sample-data/service-centre-brands";

export function ScBrandNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Brand
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Brand"
        fields={scBrandFormFields}
        submitLabel="Create Brand"
      />
    </>
  );
}
