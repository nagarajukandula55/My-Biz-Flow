"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { brandFormFields } from "@/lib/sample-data/brand";

/** Create-as-modal for brand (see src/components/RecordFormModal.tsx). */
export function BrandNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Location
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Location"
        fields={brandFormFields}
        submitLabel="Create Location"
        action={createBusinessRecordAction.bind(null, vendorId, "brand")}
      />
    </>
  );
}
