"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { posFormFields } from "@/lib/sample-data/pos";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

/** Create-as-modal for pos (see src/components/RecordFormModal.tsx). Real persistence — BusinessRecord table. */
export function PosNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Sale
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Sale"
        fields={posFormFields}
        submitLabel="Create Sale"
        action={createBusinessRecordAction.bind(null, vendorId, "pos")}
      />
    </>
  );
}
