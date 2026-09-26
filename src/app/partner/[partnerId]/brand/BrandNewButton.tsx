"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBrandAction } from "./actions";
import type { FormFieldDef } from "@/components/RecordForm";

/** Create-as-modal for Brand (see src/components/RecordFormModal.tsx). `fields` is fetched server-side by the parent page. */
export function BrandNewButton({ partnerId, fields }: { partnerId: string; fields: FormFieldDef[] }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Brand
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Brand"
        fields={fields}
        submitLabel="Create Brand"
        action={createBrandAction.bind(null, partnerId)}
      />
    </>
  );
}
