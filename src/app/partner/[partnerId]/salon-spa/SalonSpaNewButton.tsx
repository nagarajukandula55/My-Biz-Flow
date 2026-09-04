"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createSalonSpaBookingAction } from "./[recordId]/actions";
import { salonSpaFormFields } from "@/lib/sample-data/salon-spa";

/** Create-as-modal for salon-spa (see src/components/RecordFormModal.tsx). Real persistence — BusinessRecord table. */
export function SalonSpaNewButton({ partnerId }: { partnerId: string }) {
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
        fields={salonSpaFormFields}
        submitLabel="Create Booking"
        action={createSalonSpaBookingAction.bind(null, partnerId)}
      />
    </>
  );
}
