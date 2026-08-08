"use client";

import { Modal } from "./Modal";
import { renderCell, type Column, type Row } from "./DataTable";

/**
 * A lighter alternative to navigating to a full detail page — shows the
 * same columns a DataTable already renders, as a field grid in a modal.
 * Wired into DataTable itself (see its `enableQuickView` prop) so every
 * module's list page gets this for free, not just ones that opt in by
 * hand.
 */
export function QuickViewModal({
  open,
  onClose,
  columns,
  row,
  title,
}: {
  open: boolean;
  onClose: () => void;
  columns: Column[];
  row: Row | null;
  title: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {row && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {columns.map((column) => (
            <div key={column.key}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{column.label}</dt>
              <dd className="mt-1 text-sm text-text">{renderCell(column, row)}</dd>
            </div>
          ))}
        </dl>
      )}
    </Modal>
  );
}
