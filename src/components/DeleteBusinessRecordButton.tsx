"use client";

import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { deleteBusinessRecordAction } from "@/lib/businessRecordActions";

/** Generic real-delete button for any module's detail page — wraps the shared BusinessRecord delete action. */
export function DeleteBusinessRecordButton({
  vendorId,
  moduleSlug,
  recordKey,
  recordLabel,
}: {
  vendorId: string;
  moduleSlug: string;
  recordKey: string;
  recordLabel: string;
}) {
  return (
    <ConfirmDeleteDialog
      recordLabel={recordLabel}
      onConfirm={() => {
        deleteBusinessRecordAction(vendorId, moduleSlug, recordKey);
      }}
    />
  );
}
