"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { subscriptionsFormFields } from "@/lib/sample-data/subscriptions";

/** Create-as-modal for subscriptions (see src/components/RecordFormModal.tsx). */
export function SubscriptionsNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Membership
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Membership"
        fields={subscriptionsFormFields}
        submitLabel="Create Membership"
        action={createBusinessRecordAction.bind(null, vendorId, "subscriptions")}
      />
    </>
  );
}
