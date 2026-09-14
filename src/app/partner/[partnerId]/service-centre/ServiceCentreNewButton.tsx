"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import type { FormFieldDef } from "@/components/RecordForm";
import { createServiceCentreWorkorderAction } from "@/lib/serviceCentreCreateAction";
import { lookupServiceCentreCustomerAction } from "@/lib/serviceCentreCustomerLookup";

/**
 * Create-as-modal for service-centre (see src/components/RecordFormModal.tsx).
 * Real persistence — BusinessRecord table.
 *
 * `fields` is built by the list page (a Server Component) via
 * buildServiceCentreCreateFields, the SAME builder the full-page /new form
 * uses — this modal previously passed the raw serviceCentreFormFields
 * through, so it showed the unfiltered cross-domain Device Type list and no
 * brand/model suggestions. `mode="create"` applies the same create-time
 * field filtering, and the action is the validating Service-Centre-specific
 * one, so the modal and the page can't diverge.
 */
export function ServiceCentreNewButton({ partnerId, fields }: { partnerId: string; fields: FormFieldDef[] }) {
  const { open, openModal, closeModal } = useRecordFormModal();
  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Workorder
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Workorder"
        fields={fields}
        mode="create"
        submitLabel="Create Workorder"
        action={createServiceCentreWorkorderAction.bind(null, partnerId)}
        lookup={{
          watchKey: "customerPhone",
          run: lookupServiceCentreCustomerAction.bind(null, partnerId),
        }}
      />
    </>
  );
}
