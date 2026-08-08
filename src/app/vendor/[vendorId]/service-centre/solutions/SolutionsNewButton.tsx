"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { solutionsFormFields } from "@/lib/sample-data/solutions";

/** Create-as-modal for service-centre/solutions (see src/components/RecordFormModal.tsx). */
export function SolutionsNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Solution
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Solution"
        fields={solutionsFormFields}
        submitLabel="Create Solution"
      />
    </>
  );
}
