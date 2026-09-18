"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createInquiryAction } from "./actions";
import { inquiryFormFields } from "@/lib/sample-data/service-centre-inquiry";

/** Staff-side "log a call-in inquiry" — same modal pattern as SolutionsNewButton. */
export function InquiryNewButton({ partnerId }: { partnerId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Inquiry
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Inquiry"
        fields={inquiryFormFields}
        submitLabel="Log Inquiry"
        action={createInquiryAction.bind(null, partnerId)}
      />
    </>
  );
}
