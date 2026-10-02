"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { COMPANY_UPLOAD_FIELDS, REQUIRED_COMPANY_UPLOAD_FIELDS, type CompanyUploadField } from "@/lib/fieldForce/companiesData";

type Company = {
  id: string;
  name: string;
  isActive: boolean;
  columnMapping: Record<string, CompanyUploadField>;
};

const FIELD_LABEL: Record<CompanyUploadField, string> = {
  customerName: "Customer Name",
  customerPhone: "Customer Phone",
  addressLine1: "Address",
  city: "City",
  state: "State",
  pincode: "Pincode",
  serviceName: "Service Name",
  scheduledAt: "Scheduled Date/Time",
  notes: "Notes",
};

export function CompaniesClient({
  partnerId,
  companies,
  createAction,
  setMappingAction,
  setActiveAction,
  importAction,
}: {
  partnerId: string;
  companies: Company[];
  createAction: (formData: FormData) => Promise<void>;
  setMappingAction: (formData: FormData) => Promise<void>;
  setActiveAction: (formData: FormData) => Promise<void>;
  importAction: (formData: FormData) => Promise<{ createdCount: number; failed: { row: number; error: string }[] }>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ createdCount: number; failed: { row: number; error: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <button onClick={() => setShowAdd((v) => !v)} className="btn-accent">
        + Add Company
      </button>

      {showAdd && (
        <form
          action={(fd) => {
            startTransition(() => createAction(fd));
            setShowAdd(false);
          }}
          className="flex items-end gap-3 rounded-lg border border-border bg-bg-raised p-4"
        >
          <input name="name" required placeholder="Company name (e.g. Samsung)" className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <button type="submit" disabled={isPending} className="btn-accent">
            Create
          </button>
        </form>
      )}

      {error && <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}
      {importResult && (
        <div className="rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text">
          Created {importResult.createdCount} booking(s), each auto-dispatched to the nearest eligible engineer.
          {importResult.failed.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-danger">
              {importResult.failed.map((f) => (
                <li key={f.row}>
                  Row {f.row}: {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-raised text-xs font-semibold uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-3 py-2 text-left">Company</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Column Mapping</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-text-muted">
                  No companies yet — add one to start uploading their job data.
                </td>
              </tr>
            )}
            {companies.map((c) => {
              const mappedCount = Object.keys(c.columnMapping).length;
              return (
                <tr key={c.id} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-semibold text-text">{c.name}</td>
                  <td className="px-3 py-2">
                    <StatusChip label={c.isActive ? "Active" : "Inactive"} variant={c.isActive ? "success" : "neutral"} />
                  </td>
                  <td className="px-3 py-2 text-text-muted">
                    {mappedCount === 0 ? "Not set up yet" : `${mappedCount} column(s) mapped`}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => setEditingId(editingId === c.id ? null : c.id)} className="text-xs font-semibold text-accent hover:underline">
                        {editingId === c.id ? "Close mapping" : "Set up mapping"}
                      </button>
                      {mappedCount > 0 && (
                        <button type="button" onClick={() => setUploadingId(uploadingId === c.id ? null : c.id)} className="text-xs font-semibold text-accent hover:underline">
                          {uploadingId === c.id ? "Close upload" : "Upload file"}
                        </button>
                      )}
                      <form
                        action={(fd) => {
                          fd.set("id", c.id);
                          fd.set("isActive", String(!c.isActive));
                          startTransition(() => setActiveAction(fd));
                        }}
                      >
                        <button type="submit" className="text-xs text-text-muted hover:underline">
                          {c.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </div>

                    {editingId === c.id && (
                      <form
                        action={(fd) => {
                          fd.set("id", c.id);
                          startTransition(() => setMappingAction(fd));
                          setEditingId(null);
                        }}
                        className="mt-3 space-y-2 rounded-md border border-border bg-bg p-3"
                      >
                        <p className="text-xs text-text-muted">
                          For each column header exactly as it appears in {c.name}&apos;s file, pick what it means. Leave a row
                          blank to ignore that field.
                        </p>
                        {Array.from({ length: Math.max(9, Object.keys(c.columnMapping).length) }).map((_, i) => {
                          const existingEntries = Object.entries(c.columnMapping);
                          const existing = existingEntries[i];
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                name="header"
                                defaultValue={existing?.[0] ?? ""}
                                placeholder="CSV column header (e.g. Cust Name)"
                                className="w-56 rounded-md border border-border bg-bg px-2 py-1 text-xs text-text"
                              />
                              <select name="field" defaultValue={existing?.[1] ?? ""} className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text">
                                <option value="">— ignore —</option>
                                {COMPANY_UPLOAD_FIELDS.map((f) => (
                                  <option key={f} value={f}>
                                    {FIELD_LABEL[f]}
                                    {REQUIRED_COMPANY_UPLOAD_FIELDS.includes(f) ? " *" : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                        <p className="text-[11px] text-text-muted">* Required for a booking to be created from a row.</p>
                        <button type="submit" disabled={isPending} className="btn-accent text-xs">
                          Save Mapping
                        </button>
                      </form>
                    )}

                    {uploadingId === c.id && (
                      <form
                        action={(fd) => {
                          setError(null);
                          setImportResult(null);
                          fd.set("companyId", c.id);
                          startTransition(async () => {
                            try {
                              const result = await importAction(fd);
                              setImportResult(result);
                              setUploadingId(null);
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Upload failed");
                            }
                          });
                        }}
                        className="mt-3 flex items-center gap-3 rounded-md border border-border bg-bg p-3"
                      >
                        <input type="file" name="file" accept=".csv" required className="text-xs text-text" />
                        <button type="submit" disabled={isPending} className="btn-accent text-xs">
                          {isPending ? "Uploading…" : "Upload & Create Bookings"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
