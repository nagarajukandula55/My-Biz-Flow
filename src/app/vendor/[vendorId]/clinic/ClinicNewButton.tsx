"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { clinicFormFields } from "@/lib/sample-data/clinic";

/** Create-as-modal for clinic (see src/components/RecordFormModal.tsx). */
export function ClinicNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Appointment
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Appointment"
        fields={clinicFormFields}
        submitLabel="Create Appointment"
      />
    </>
  );
}
