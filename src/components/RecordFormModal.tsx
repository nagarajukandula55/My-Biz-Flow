"use client";

import { useState, type ComponentProps } from "react";
import { Modal } from "./Modal";
import { RecordForm, type FormFieldDef } from "./RecordForm";

/**
 * Create/Edit as a modal instead of navigating to a separate /new or
 * /edit page — an alternative a list page can opt into. Most modules
 * still use the full-page form (RecordForm rendered directly on a /new
 * or /edit route); this is for pages that want the "stay on the list"
 * flow instead. Wraps RecordForm, no new form logic of its own.
 */
export function RecordFormModal({
  open,
  onClose,
  title,
  fields,
  initialValues,
  submitLabel,
  action,
  lookup,
  mode,
  layout,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FormFieldDef[];
  initialValues?: Record<string, unknown>;
  submitLabel: string;
  action?: ComponentProps<typeof RecordForm>["action"];
  /** Forwarded straight to RecordForm — see its `lookup` prop. */
  lookup?: ComponentProps<typeof RecordForm>["lookup"];
  /** Forwarded straight to RecordForm — "create" drops createHidden fields. */
  mode?: ComponentProps<typeof RecordForm>["mode"];
  /** Forwarded straight to RecordForm — "columns" renders sections as cards. */
  layout?: ComponentProps<typeof RecordForm>["layout"];
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <RecordForm
        fields={fields}
        initialValues={initialValues}
        submitLabel={submitLabel}
        action={action}
        lookup={lookup}
        mode={mode}
        layout={layout}
      />
    </Modal>
  );
}

/** Convenience hook for the common "+ New" trigger button + modal pair. */
export function useRecordFormModal() {
  const [open, setOpen] = useState(false);
  return { open, openModal: () => setOpen(true), closeModal: () => setOpen(false) };
}
