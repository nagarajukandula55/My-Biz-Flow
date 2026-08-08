"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { bomFormFields } from "@/lib/sample-data/bom";

/**
 * Live proof of the Create-as-modal pattern (see RecordFormModal.tsx) —
 * "+ New Material" opens a modal over the list instead of navigating to
 * /new. The /new route still exists as a direct-link fallback; most other
 * modules keep the full-page form for now (see chat: rolling this out
 * everywhere is a separate, larger follow-up).
 */
export function BomNewButton() {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Material
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Material"
        fields={bomFormFields}
        submitLabel="Create Material"
      />
    </>
  );
}
