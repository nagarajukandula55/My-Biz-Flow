"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { educationFormFields } from "@/lib/sample-data/education";
import { createEnrollmentAction } from "./actions";

/** Create-as-modal for education (see src/components/RecordFormModal.tsx). */
export function EducationNewButton({ partnerId }: { partnerId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Enrollment
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Enrollment"
        fields={educationFormFields}
        submitLabel="Create Enrollment"
        action={createEnrollmentAction.bind(null, partnerId)}
      />
    </>
  );
}
