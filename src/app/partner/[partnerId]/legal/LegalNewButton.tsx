"use client";

import { RecordFormModal, useRecordFormModal } from "@/components/RecordFormModal";
import type { FormFieldDef } from "@/components/RecordForm";
import { LEGAL_MATTER_STATUSES, type LegalClientRecord } from "@/lib/legal";
import { createLegalMatterAction } from "./actions";

/** Create-as-modal for a Legal matter, now backed by real LegalClient rows
 * (clientId select) instead of a free-text "client" field. */
export function LegalNewButton({ partnerId, clients }: { partnerId: string; clients: LegalClientRecord[] }) {
  const { open, openModal, closeModal } = useRecordFormModal();

  const matterFormFields: FormFieldDef[] = [
    {
      key: "clientId",
      label: "Client",
      type: "select",
      required: true,
      options: clients.map((c) => c.id),
      optionLabels: Object.fromEntries(clients.map((c) => [c.id, c.name])),
    },
    { key: "title", label: "Title", type: "text", required: true },
    { key: "matterType", label: "Matter Type", type: "text", required: false },
    { key: "status", label: "Status", type: "select", required: true, options: [...LEGAL_MATTER_STATUSES] },
    { key: "openedDate", label: "Opened Date", type: "date", required: false },
  ];

  return (
    <>
      <button type="button" className="btn-accent" onClick={openModal}>
        + New Matter
      </button>
      <RecordFormModal
        open={open}
        onClose={closeModal}
        title="New Matter"
        fields={matterFormFields}
        submitLabel="Create Matter"
        action={createLegalMatterAction.bind(null, partnerId)}
      />
    </>
  );
}
