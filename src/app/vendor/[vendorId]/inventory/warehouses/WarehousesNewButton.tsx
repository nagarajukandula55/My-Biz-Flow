"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { warehouseFormFields } from "@/lib/sample-data/warehouse";

/** Create-as-modal for inventory/warehouses (see src/components/RecordFormModal.tsx). */
export function WarehousesNewButton({ vendorId }: { vendorId: string }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Warehouse
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Warehouse"
        fields={warehouseFormFields}
        submitLabel="Create Warehouse"
        action={createBusinessRecordAction.bind(null, vendorId, "inventory-warehouses")}
      />
    </>
  );
}
