"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createStockTakeAction } from "./actions";
import type { FormFieldDef } from "@/components/RecordForm";

/** Create-as-modal for inventory/stock-take (see src/components/RecordFormModal.tsx). `fields` is fetched server-side by the parent page (getStockTakeFormFields, partner-scoped). */
export function StockTakeNewButton({ partnerId, fields }: { partnerId: string; fields: FormFieldDef[] }) {
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
        fields={fields}
        submitLabel="Save Count"
        action={createStockTakeAction.bind(null, partnerId)}
      />
    </>
  );
}
