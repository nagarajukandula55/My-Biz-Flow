"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { scFaultCodeFormFields } from "@/lib/sample-data/service-centre-fault-codes";

export function ScFaultCodeNewButton({ partnerId }: { partnerId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Fault Code
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Fault Code"
        fields={scFaultCodeFormFields}
        submitLabel="Create Fault Code"
        action={createBusinessRecordAction.bind(null, partnerId, "service-centre-fault-codes")}
      />
    </>
  );
}
