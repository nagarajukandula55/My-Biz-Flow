"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { legalFormFields } from "@/lib/sample-data/legal";

/** Create-as-modal for legal (see src/components/RecordFormModal.tsx). */
export function LegalNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Matter
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Matter"
        fields={legalFormFields}
        submitLabel="Create Matter"
        action={createBusinessRecordAction.bind(null, vendorId, "legal")}
      />
    </>
  );
}
