"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { scBrandFormFields } from "@/lib/sample-data/service-centre-brands";

export function ScBrandNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Brand
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Brand"
        fields={scBrandFormFields}
        submitLabel="Create Brand"
        action={createBusinessRecordAction.bind(null, vendorId, "service-centre-brands")}
      />
    </>
  );
}
