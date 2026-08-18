"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { billingContactFormFields } from "@/lib/sample-data/billing-contacts";

/** Create-as-modal for billing/contacts (see src/components/RecordFormModal.tsx). */
export function ContactsNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Contact
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Contact"
        fields={billingContactFormFields}
        submitLabel="Create Contact"
        action={createBusinessRecordAction.bind(null, vendorId, "billing-contacts")}
      />
    </>
  );
}
