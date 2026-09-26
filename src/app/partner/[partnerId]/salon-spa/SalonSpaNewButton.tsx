"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createSalonSpaBookingAction } from "./[recordId]/actions";
import { buildSalonSpaFormFields } from "@/lib/sample-data/salon-spa";
import type { SalonServiceRecord } from "@/lib/salonSpa/servicesData";

/** Create-as-modal for salon-spa (see src/components/RecordFormModal.tsx). Real persistence — SalonAppointment table. */
export function SalonSpaNewButton({ partnerId, services }: { partnerId: string; services: SalonServiceRecord[] }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Appointment
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Appointment"
        fields={buildSalonSpaFormFields(services)}
        submitLabel="Create Appointment"
        mode="create"
        action={createSalonSpaBookingAction.bind(null, partnerId)}
      />
    </>
  );
}
