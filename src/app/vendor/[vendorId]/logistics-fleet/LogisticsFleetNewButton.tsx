"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { logisticsFleetFormFields } from "@/lib/sample-data/logistics-fleet";

/** Create-as-modal for logistics-fleet (see src/components/RecordFormModal.tsx). */
export function LogisticsFleetNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Shipment
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Shipment"
        fields={logisticsFleetFormFields}
        submitLabel="Create Shipment"
        action={createBusinessRecordAction.bind(null, vendorId, "logistics-fleet")}
      />
    </>
  );
}
