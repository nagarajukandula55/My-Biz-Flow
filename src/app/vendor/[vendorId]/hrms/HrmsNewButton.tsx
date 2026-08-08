"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { hrmsFormFields } from "@/lib/sample-data/hrms";

/** Create-as-modal for hrms (see src/components/RecordFormModal.tsx). */
export function HrmsNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Employee
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Employee"
        fields={hrmsFormFields}
        submitLabel="Create Employee"
        action={createBusinessRecordAction.bind(null, vendorId, "hrms")}
      />
    </>
  );
}
