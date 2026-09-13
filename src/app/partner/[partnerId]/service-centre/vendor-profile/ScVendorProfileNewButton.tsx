"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { scVendorProfileFormFields } from "@/lib/sample-data/service-centre-vendor-profile";

export function ScVendorProfileNewButton({ partnerId }: { partnerId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Vendor Profile
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Vendor Profile"
        fields={scVendorProfileFormFields}
        submitLabel="Create Vendor Profile"
        action={createBusinessRecordAction.bind(null, partnerId, "service-centre-vendor-profile")}
      />
    </>
  );
}
