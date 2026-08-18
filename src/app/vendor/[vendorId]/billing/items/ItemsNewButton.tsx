"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { billingItemFormFields } from "@/lib/sample-data/billing-items";

/** Create-as-modal for billing/items (see src/components/RecordFormModal.tsx). */
export function ItemsNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Item
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Item"
        fields={billingItemFormFields}
        submitLabel="Create Item"
        action={createBusinessRecordAction.bind(null, vendorId, "billing-items")}
      />
    </>
  );
}
