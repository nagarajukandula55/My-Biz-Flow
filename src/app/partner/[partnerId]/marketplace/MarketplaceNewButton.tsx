"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { marketplaceFormFields } from "@/lib/sample-data/marketplace";

/** Create-as-modal for marketplace (see src/components/RecordFormModal.tsx). */
export function MarketplaceNewButton({ partnerId }: { partnerId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Partner Listing
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Partner Listing"
        fields={marketplaceFormFields}
        submitLabel="Create Partner Listing"
        action={createBusinessRecordAction.bind(null, partnerId, "marketplace")}
      />
    </>
  );
}
