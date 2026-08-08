"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { stockFormFields } from "@/lib/sample-data/warehouse";

/** Create-as-modal for inventory/stock (see src/components/RecordFormModal.tsx). */
export function StockNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Stock Entry
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Stock Entry"
        fields={stockFormFields}
        submitLabel="Create Stock Entry"
        action={createBusinessRecordAction.bind(null, vendorId, "inventory-stock")}
      />
    </>
  );
}
