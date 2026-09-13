"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { expenseFormFields } from "@/lib/sample-data/billing-expenses";

export function ExpensesNewButton({ partnerId }: { partnerId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Expense
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Expense"
        fields={expenseFormFields}
        submitLabel="Record Expense"
        action={createBusinessRecordAction.bind(null, partnerId, "billing-expenses")}
      />
    </>
  );
}
