"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { restaurantPosFormFields } from "@/lib/sample-data/restaurant-pos";

/** Create-as-modal for restaurant-pos (see src/components/RecordFormModal.tsx). */
export function RestaurantPosNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Order
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Order"
        fields={restaurantPosFormFields}
        submitLabel="Create Order"
        action={createBusinessRecordAction.bind(null, vendorId, "restaurant-pos")}
      />
    </>
  );
}
