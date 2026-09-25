"use client";

import { useState, useTransition } from "react";
import { formatDateTime } from "@/lib/format";
import type { LegalDocumentRecord } from "@/lib/legal";
import { addLegalDocumentAction } from "./actions";

export function DocumentsSection({
  partnerId,
  matterId,
  initialDocuments,
}: {
  partnerId: string;
  matterId: string;
  initialDocuments: LegalDocumentRecord[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    const optimistic: LegalDocumentRecord = {
      id: `pending-${Date.now()}`,
      matterId,
      title: title.trim(),
      documentType: documentType || null,
      uploadedAt: new Date().toISOString(),
    };
    setDocuments((prev) => [optimistic, ...prev]);
    setFormOpen(false);
    const input = { title: title.trim(), documentType: documentType || undefined };
    setTitle("");
    setDocumentType("");
    startTransition(async () => {
      await addLegalDocumentAction(partnerId, matterId, input);
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-text">Documents</h2>
        <button type="button" className="btn-outline" onClick={() => setFormOpen((v) => !v)}>
          + Add Document
        </button>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Document metadata only — file storage not yet available. This records a document's title, type and upload
        timestamp; no actual file is uploaded or stored anywhere.
      </p>

      {documents.length === 0 && !formOpen && (
        <p className="mt-3 text-sm text-text-muted">No documents recorded yet.</p>
      )}

      {documents.length > 0 && (
        <div className="mt-3 space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm">
              <div>
                <span className="font-semibold text-text">{doc.title}</span>
                {doc.documentType && <span className="ml-2 text-xs text-text-muted">({doc.documentType})</span>}
              </div>
              <span className="text-xs text-text-muted">{formatDateTime(doc.uploadedAt)}</span>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="mt-4 space-y-3 rounded-md border border-border bg-bg p-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Document Type</label>
            <input
              type="text"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              placeholder="e.g. Contract, Affidavit, Court Order"
              className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text"
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="btn-accent" onClick={submit}>
              Save Document
            </button>
            <button type="button" className="btn-outline" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
