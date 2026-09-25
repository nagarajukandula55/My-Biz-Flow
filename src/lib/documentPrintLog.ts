/**
 * Logs "a printable document tied to this workorder was opened" into the
 * workorder's own activity timeline — same real-modify-write-against-the-
 * JSON-blob pattern as appendTelegramChatLogEntry (src/lib/telegram.ts).
 *
 * Response to a real partner request: printing a Workorder/Estimate/Service
 * Record/Invoice previously left no trace in the activity log at all. Since
 * window.print() itself is a client-side browser action a Server Component
 * can't observe, the practical proxy used here is "the print/document page
 * was loaded" — every entry point into these pages (PrintPopupLink /
 * openPrintPopup, see src/components/PrintPopupLink.tsx and
 * src/lib/openPrintPopup.ts) is a real button click that opens a popup
 * window, never a Next.js <Link>, so there is no prefetch-on-hover risk.
 * The short time-window de-dupe below is still kept as cheap insurance
 * against any other double-render (e.g. a double-click, or a popup window
 * re-requesting the same URL) rather than relying on that alone.
 */
import type { TimelineEntry } from "@/components/RecordDetail";
import { getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";

export type DocumentPrintLogEntry = {
  at: string;
  type: "document_printed";
  /** Which document was opened, e.g. "Workorder", "Estimate", "Service Record", "Invoice" — rendered directly into the timeline label. */
  documentLabel: string;
};

const DEDUPE_WINDOW_MS = 60_000;

/**
 * Appends one entry to a workorder's `documentPrintLog` array field
 * (service-centre BusinessRecord). Call from the top of each print/
 * document page's Server Component, right after confirming the record
 * exists — see document/page.tsx, invoice/page.tsx, estimate/page.tsx,
 * service-record/page.tsx. Rendered into the unified activity feed by
 * getServiceCentreTimeline (src/lib/sample-data/service-centre.ts).
 */
export async function appendDocumentPrintedLogEntry(
  partnerId: string,
  workorderId: string,
  documentLabel: string
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "service-centre", workorderId);
  if (!record) return;
  const existing = (record["documentPrintLog"] as DocumentPrintLogEntry[] | undefined) ?? [];

  // Skip if the exact same document was logged as printed within the last
  // minute — a same-tab reload, double-click, or any other unintended
  // re-render of the print page shouldn't spam the timeline with repeats.
  const now = Date.now();
  const last = existing[existing.length - 1];
  if (
    last &&
    last.type === "document_printed" &&
    last.documentLabel === documentLabel &&
    now - new Date(last.at).getTime() < DEDUPE_WINDOW_MS
  ) {
    return;
  }

  const next: DocumentPrintLogEntry[] = [
    ...existing,
    { at: new Date().toISOString(), type: "document_printed", documentLabel },
  ];
  await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...record, documentPrintLog: next });
}

/** Reads a workorder record's documentPrintLog into TimelineEntry rows — folded into getServiceCentreTimeline's unified feed. */
export function documentPrintLogToTimelineEntries(record: Record<string, unknown>): TimelineEntry[] {
  const log = (record["documentPrintLog"] as DocumentPrintLogEntry[] | undefined) ?? [];
  return log
    .filter((entry): entry is DocumentPrintLogEntry => Boolean(entry) && typeof entry.at === "string")
    .map((entry, i) => ({
      id: `document-printed-${i}`,
      label: `${entry.documentLabel} printed`,
      timestamp: entry.at,
    }));
}
