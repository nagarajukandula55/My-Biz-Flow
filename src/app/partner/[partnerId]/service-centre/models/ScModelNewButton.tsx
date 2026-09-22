"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { scModelFormFieldsFor } from "@/lib/sample-data/service-centre-models";

export function ScModelNewButton({ partnerId, brandNames }: { partnerId: string; brandNames: string[] }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Model
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Model"
        fields={scModelFormFieldsFor(brandNames)}
        submitLabel="Create Model"
        action={(values: Record<string, unknown>) => createBusinessRecordAction(partnerId, "service-centre-models", values, "service-centre/models")}
      />
    </>
  );
}
