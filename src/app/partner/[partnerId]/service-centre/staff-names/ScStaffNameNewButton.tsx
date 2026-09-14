"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { scStaffNameFormFields } from "@/lib/sample-data/service-centre-staff-names";

export function ScStaffNameNewButton({ partnerId }: { partnerId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Staff Name
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Staff Name"
        fields={scStaffNameFormFields}
        submitLabel="Add Name"
        action={createBusinessRecordAction.bind(null, partnerId, "service-centre-staff-names")}
      />
    </>
  );
}
