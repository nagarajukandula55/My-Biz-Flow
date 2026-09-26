"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import type { FormFieldDef } from "@/components/RecordForm";
import { createEnquiryAction } from "./[recordId]/actions";

/** Create-as-modal for real-estate Enquiries (see src/components/RecordFormModal.tsx). */
export function RealEstateNewButton({ partnerId, fields }: { partnerId: string; fields: FormFieldDef[] }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Enquiry
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Enquiry"
        fields={fields}
        submitLabel="Create Enquiry"
        action={createEnquiryAction.bind(null, partnerId)}
      />
    </>
  );
}
