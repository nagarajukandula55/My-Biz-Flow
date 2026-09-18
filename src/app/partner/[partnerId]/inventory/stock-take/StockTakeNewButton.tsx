"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createStockTakeAction } from "./actions";
import { stockTakeFormFields } from "@/lib/sample-data/warehouse";

/** Create-as-modal for inventory/stock-take (see src/components/RecordFormModal.tsx). */
export function StockTakeNewButton({ partnerId }: { partnerId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Stock Take
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Stock Take"
        fields={stockTakeFormFields}
        submitLabel="Save Count"
        action={createStockTakeAction.bind(null, partnerId)}
      />
    </>
  );
}
