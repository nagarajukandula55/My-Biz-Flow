"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { serviceCentreFormFields } from "@/lib/sample-data/service-centre";

/** Create-as-modal for service-centre (see src/components/RecordFormModal.tsx). */
export function ServiceCentreNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Workorder
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Workorder"
        fields={serviceCentreFormFields}
        submitLabel="Create Workorder"
      />
    </>
  );
}
