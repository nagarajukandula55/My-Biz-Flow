"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { gstItcFormFields } from "@/lib/sample-data/accounting-gst-itc";

/** Create-as-modal for accounting-gst/itc (see src/components/RecordFormModal.tsx). */
export function GstItcNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New ITC Entry
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New ITC Entry"
        fields={gstItcFormFields}
        submitLabel="Record Entry"
        action={createBusinessRecordAction.bind(null, vendorId, "accounting-gst-itc")}
      />
    </>
  );
}
