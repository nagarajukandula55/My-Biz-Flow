"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { loyaltyRewardsFormFields } from "@/lib/sample-data/loyalty-rewards";

/** Create-as-modal for loyalty-rewards (see src/components/RecordFormModal.tsx). */
export function LoyaltyRewardsNewButton() {
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
      />
    </>
  );
}
