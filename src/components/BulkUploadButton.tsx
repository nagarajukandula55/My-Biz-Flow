"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { downloadCsvTemplate } from "@/lib/downloadCsvTemplate";
import type { BulkImportResult } from "@/lib/bulkImportCsv";

/**
 * Generic "Upload CSV" button + modal — same UX every bulk-import feature
 * in this app uses (originally one-off per module, e.g. BomBulkUploadButton),
 * now shared so a new module gets bulk import without re-implementing the
 * modal/file-input/result-reporting UI. The server-side parsing/creation
 * itself lives in src/lib/bulkImportCsv.ts's runBulkImport(), called from
 * each module's own thin Server Action (importAction here).
 */
export function BulkUploadButton({
  title,
  columns,
  requiredColumnsNote,
  sampleRow,
  templateFilename,
  importAction,
}: {
  title: string;
  /** CSV header columns, in order — shown to the user and used for the downloadable template. */
  columns: string[];
  /** Short note on which columns are required, e.g. "Only Material, Quantity and Date are required per row." */
  requiredColumnsNote?: string;
  /** One example value per column, same order as `columns`, for the downloadable template's sample row. */
  sampleRow: string[];
  templateFilename: string;
  /** Server Action, already bound to partnerId — takes the raw FormData (with a `file` entry) and returns the import result. */
  importAction: (formData: FormData) => Promise<BulkImportResult>;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDownloadTemplate() {
    downloadCsvTemplate(templateFilename, columns, sampleRow);
  }

  function handleUpload(formData: FormData) {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await importAction(formData);
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg-sunken"
      >
        Upload CSV
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} size="md">
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            CSV columns (header row required): {columns.join(", ")}.{requiredColumnsNote ? ` ${requiredColumnsNote}` : ""}
          </p>
          {error && <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}
          {result && (
            <div className="rounded-md border border-success bg-success-soft px-3 py-2 text-sm text-success">
              Imported {result.count} row(s).
              {result.failed.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-danger">
                  {result.failed.map((f) => (
                    <li key={f.row}>
                      Row {f.row}: {f.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <form action={handleUpload} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input type="file" name="file" accept=".csv" required className="text-sm text-text" />
              <button type="button" onClick={handleDownloadTemplate} className="text-sm font-semibold text-accent hover:underline">
                Download template
              </button>
            </div>
            <button type="submit" disabled={isPending} className="btn-accent">
              {isPending ? "Uploading…" : "Upload & Import"}
            </button>
          </form>
        </div>
      </Modal>
    </>
  );
}
