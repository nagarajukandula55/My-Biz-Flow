"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { eventBookingFormFields } from "@/lib/sample-data/event-booking";

/** Create-as-modal for event-booking (see src/components/RecordFormModal.tsx). */
export function EventBookingNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Event
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Event"
        fields={eventBookingFormFields}
        submitLabel="Create Event"
      />
    </>
  );
}
