"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import type { FormFieldDef } from "@/components/RecordForm";

/** Create-as-modal for brand (see src/components/RecordFormModal.tsx). `fields` is fetched server-side by the parent page (getBrandFormFields, partner-scoped). */
export function BrandNewButton({ partnerId, fields }: { partnerId: string; fields: FormFieldDef[] }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Location
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Location"
        fields={fields}
        submitLabel="Create Location"
        action={createBusinessRecordAction.bind(null, partnerId, "brand")}
      />
    </>
  );
}
