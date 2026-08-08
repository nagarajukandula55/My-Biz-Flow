"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { marketplaceFormFields } from "@/lib/sample-data/marketplace";

/** Create-as-modal for marketplace (see src/components/RecordFormModal.tsx). */
export function MarketplaceNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Vendor Listing
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Vendor Listing"
        fields={marketplaceFormFields}
        submitLabel="Create Vendor Listing"
      />
    </>
  );
}
