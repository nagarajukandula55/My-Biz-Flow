"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createPartOrderAction } from "./actions";
import type { FormFieldDef } from "@/components/RecordForm";

/** Create-as-modal for inventory/part-orders (see src/components/RecordFormModal.tsx). `fields` is fetched server-side by the parent page (getPartOrderFormFields, partner-scoped). */
export function PartOrdersNewButton({ partnerId, fields }: { partnerId: string; fields: FormFieldDef[] }) {
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
        fields={fields}
        submitLabel="Create Part Order"
        action={createPartOrderAction.bind(null, partnerId)}
      />
    </>
  );
}
