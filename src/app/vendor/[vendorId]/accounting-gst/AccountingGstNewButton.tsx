"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { accountingGstFormFields } from "@/lib/sample-data/accounting-gst";

/** Create-as-modal for accounting-gst (see src/components/RecordFormModal.tsx). */
export function AccountingGstNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New GST Return
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New GST Return"
        fields={accountingGstFormFields}
        submitLabel="Create GST Return"
      />
    </>
  );
}
