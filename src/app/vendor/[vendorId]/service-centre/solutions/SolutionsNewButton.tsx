"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { solutionsFormFields } from "@/lib/sample-data/solutions";

/** Create-as-modal for service-centre/solutions (see src/components/RecordFormModal.tsx). */
export function SolutionsNewButton({ vendorId }: { vendorId: string }) {
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
        action={createBusinessRecordAction.bind(null, vendorId, "service-centre-solutions")}
      />
    </>
  );
}
