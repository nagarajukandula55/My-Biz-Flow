"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { manufacturingFormFields } from "@/lib/sample-data/manufacturing";

/** Create-as-modal for manufacturing (see src/components/RecordFormModal.tsx). */
export function ManufacturingNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Work Order
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Work Order"
        fields={manufacturingFormFields}
        submitLabel="Create Work Order"
        action={createBusinessRecordAction.bind(null, vendorId, "manufacturing")}
      />
    </>
  );
}
