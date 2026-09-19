"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createStockTransferAction } from "./actions";
import type { FormFieldDef } from "@/components/RecordForm";

/**
 * Create-as-modal for inventory/stock-transfers (see
 * src/components/RecordFormModal.tsx). Was bound to the generic
 * createBusinessRecordAction, which skipped createStockTransferAction's
 * own gating — a partner-to-partner transfer (toPartnerId set to a
 * different partner) needs to land as "Pending Super Admin Approval", not
 * whatever status the raw form submitted, and the generic action has no
 * idea that rule exists. `fields` is fetched server-side by the parent
 * page (getStockTransferFormFields, partner-scoped).
 */
export function StockTransfersNewButton({ partnerId, fields }: { partnerId: string; fields: FormFieldDef[] }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Transfer
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Transfer"
        fields={fields}
        submitLabel="Create Transfer"
        action={createStockTransferAction.bind(null, partnerId)}
      />
    </>
  );
}
