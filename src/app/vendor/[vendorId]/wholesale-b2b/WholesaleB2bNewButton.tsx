"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { wholesaleB2bFormFields } from "@/lib/sample-data/wholesale-b2b";

/** Create-as-modal for wholesale-b2b (see src/components/RecordFormModal.tsx). */
export function WholesaleB2bNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Order
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Order"
        fields={wholesaleB2bFormFields}
        submitLabel="Create Order"
        action={createBusinessRecordAction.bind(null, vendorId, "wholesale-b2b")}
      />
    </>
  );
}
