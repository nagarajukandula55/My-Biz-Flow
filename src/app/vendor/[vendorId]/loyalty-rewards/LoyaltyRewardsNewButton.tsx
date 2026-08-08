"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { loyaltyRewardsFormFields } from "@/lib/sample-data/loyalty-rewards";

/** Create-as-modal for loyalty-rewards (see src/components/RecordFormModal.tsx). */
export function LoyaltyRewardsNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Member
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Member"
        fields={loyaltyRewardsFormFields}
        submitLabel="Create Member"
        action={createBusinessRecordAction.bind(null, vendorId, "loyalty-rewards")}
      />
    </>
  );
}
