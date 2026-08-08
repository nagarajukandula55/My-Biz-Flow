"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { serviceCentreFormFields } from "@/lib/sample-data/service-centre";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

/** Create-as-modal for service-centre (see src/components/RecordFormModal.tsx). Real persistence — BusinessRecord table. */
export function ServiceCentreNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Workorder
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Workorder"
        fields={serviceCentreFormFields}
        submitLabel="Create Workorder"
        action={createBusinessRecordAction.bind(null, vendorId, "service-centre")}
      />
    </>
  );
}
