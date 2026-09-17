"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { customersFormFields } from "@/lib/sample-data/service-centre-customers";

export function ScCustomerNewButton({ partnerId }: { partnerId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Customer
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Customer"
        fields={customersFormFields}
        submitLabel="Create Customer"
        action={createBusinessRecordAction.bind(null, partnerId, "service-centre-customers")}
      />
    </>
  );
}
