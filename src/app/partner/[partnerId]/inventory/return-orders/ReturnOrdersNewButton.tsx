"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createReturnOrderAction } from "./actions";
import type { FormFieldDef } from "@/components/RecordForm";

/** Create-as-modal for inventory/return-orders (see src/components/RecordFormModal.tsx). `fields` is fetched server-side by the parent page (getReturnOrderFormFields, partner-scoped). */
export function ReturnOrdersNewButton({ partnerId, fields }: { partnerId: string; fields: FormFieldDef[] }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Return Order
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Return Order"
        fields={fields}
        submitLabel="Create Return Order"
        action={createReturnOrderAction.bind(null, partnerId)}
      />
    </>
  );
}
