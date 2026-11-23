"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import type { FormFieldDef } from "@/components/RecordForm";

/**
 * Live proof of the Create-as-modal pattern (see RecordFormModal.tsx) —
 * "+ New Material" opens a modal over the list instead of navigating to
 * /new. The /new route still exists as a direct-link fallback; most other
 * modules keep the full-page form for now (see chat: rolling this out
 * everywhere is a separate, larger follow-up).
 */
export function BomNewButton({ partnerId, fields }: { partnerId: string; fields: FormFieldDef[] }) {
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
        fields={fields}
        submitLabel="Create Material"
        action={(values: Record<string, unknown>) => createBusinessRecordAction(partnerId, "inventory-bom", values, "inventory/bom")}
      />
    </>
  );
}
