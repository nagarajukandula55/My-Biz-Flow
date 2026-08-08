"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { realEstateFormFields } from "@/lib/sample-data/real-estate";

/** Create-as-modal for real-estate (see src/components/RecordFormModal.tsx). */
export function RealEstateNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Listing
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Listing"
        fields={realEstateFormFields}
        submitLabel="Create Listing"
        action={createBusinessRecordAction.bind(null, vendorId, "real-estate")}
      />
    </>
  );
}
