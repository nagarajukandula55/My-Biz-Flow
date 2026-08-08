"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { rentalsFormFields } from "@/lib/sample-data/rentals";

/** Create-as-modal for rentals (see src/components/RecordFormModal.tsx). */
export function RentalsNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Booking
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Booking"
        fields={rentalsFormFields}
        submitLabel="Create Booking"
        action={createBusinessRecordAction.bind(null, vendorId, "rentals")}
      />
    </>
  );
}
