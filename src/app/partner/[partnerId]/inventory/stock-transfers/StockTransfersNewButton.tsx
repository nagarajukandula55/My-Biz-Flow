"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { stockTransferFormFields } from "@/lib/sample-data/warehouse";

/** Create-as-modal for inventory/stock-transfers (see src/components/RecordFormModal.tsx). */
export function StockTransfersNewButton({ partnerId }: { partnerId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Transfer
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Transfer"
        fields={stockTransferFormFields}
        submitLabel="Create Transfer"
        action={createBusinessRecordAction.bind(null, partnerId, "inventory-stock-transfers")}
      />
    </>
  );
}
