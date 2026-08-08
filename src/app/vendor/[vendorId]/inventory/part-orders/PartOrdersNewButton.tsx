"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { partOrderFormFields } from "@/lib/sample-data/warehouse";

/** Create-as-modal for inventory/part-orders (see src/components/RecordFormModal.tsx). */
export function PartOrdersNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Part Order
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Part Order"
        fields={partOrderFormFields}
        submitLabel="Create Part Order"
        action={createBusinessRecordAction.bind(null, vendorId, "inventory-part-orders")}
      />
    </>
  );
}
