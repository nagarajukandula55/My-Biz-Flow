"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { scSymptomCodeFormFields } from "@/lib/sample-data/service-centre-symptom-codes";

export function ScSymptomCodeNewButton({ partnerId }: { partnerId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Symptom Code
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Symptom Code"
        fields={scSymptomCodeFormFields}
        submitLabel="Create Symptom Code"
        action={createBusinessRecordAction.bind(null, partnerId, "service-centre-symptom-codes")}
      />
    </>
  );
}
