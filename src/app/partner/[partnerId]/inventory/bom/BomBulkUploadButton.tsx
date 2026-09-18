"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { bulkImportBomAction } from "./actions";
import { bomFormFields } from "@/lib/sample-data/bom";

/** Bulk CSV upload for the Material Catalog, same UX pattern as Telecalling's
 * "Upload CSV" (see LeadsClient.tsx, importLeadsAction) — a modal with a
 * file input that posts to a server action and reports how many rows made
 * it in vs. failed. */
export function BomBulkUploadButton({ partnerId }: { partnerId: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ count: number; failed: { row: number; error: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const boundImport = bulkImportBomAction.bind(null, partnerId);
  // "id" (Material Code) is excluded — it's auto-generated when left blank,
  // not a column a CSV upload should ask for (see actions.ts).
  const csvColumns = bomFormFields.filter((f) => f.key !== "id").map((f) => f.key).join(", ");

  function handleUpload(formData: FormData) {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await boundImport(formData);
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
      <Modal open={open} onClose={() => setOpen(false)} title="Bulk Upload Materials" size="md">
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            CSV columns (header row required): {csvColumns}. Only Material Description, HSN Code, Type, UOM, Rate,
            Rate Type, Tax % and Status are required per row.
          </p>
          {error && <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}
          {result && (
            <div className="rounded-md border border-success bg-success-soft px-3 py-2 text-sm text-success">
              Imported {result.count} material(s).
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
            <input type="file" name="file" accept=".csv" required className="text-sm text-text" />
            <button type="submit" disabled={isPending} className="btn-accent">
              {isPending ? "Uploading…" : "Upload & Import"}
            </button>
          </form>
        </div>
      </Modal>
    </>
  );
}
