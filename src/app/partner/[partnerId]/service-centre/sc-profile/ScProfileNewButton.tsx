"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { scProfileFormFields } from "@/lib/sample-data/service-centre-sc-profile";

export function ScProfileNewButton({ partnerId }: { partnerId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New SC Profile
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New SC Profile"
        fields={scProfileFormFields}
        submitLabel="Create SC Profile"
        action={createBusinessRecordAction.bind(null, partnerId, "service-centre-sc-profile")}
      />
    </>
  );
}
