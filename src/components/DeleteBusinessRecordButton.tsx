/**
 * Deletion of a saved BusinessRecord is not offered to partners anywhere in
 * the app — records are business data (invoices, workorders, master-data
 * rows, etc.) that should be archived/marked inactive via a Status field,
 * never hard-deleted from a partner-facing UI. This component used to render
 * a real "Delete" button (wired to `deleteBusinessRecordAction`) on ~30
 * module detail pages; it is now a permanent no-op so every one of those
 * pages stops showing Delete without editing each page individually. The
 * server action itself also rejects any call (see
 * `deleteBusinessRecordAction` in `@/lib/businessRecordActions`), so this
 * isn't just a UI hide.
 */
export function DeleteBusinessRecordButton(_props: {
  partnerId: string;
  moduleSlug: string;
  recordKey: string;
  recordLabel: string;
}) {
  return null;
}
