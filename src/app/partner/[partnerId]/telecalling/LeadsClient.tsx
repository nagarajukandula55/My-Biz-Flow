"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { createLeadAction, importLeadsAction, assignLeadAction } from "@/lib/telecalling/actions";
import { LEAD_STATUSES } from "@/lib/telecalling/leadsData";

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  state: string | null;
  city: string | null;
  importBatch: string;
  status: string;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
};

type Agent = { id: string; name: string };

const STATUS_VARIANT: Record<string, "neutral" | "amber" | "success" | "danger" | "warning"> = {
  New: "neutral",
  Contacted: "amber",
  Interested: "success",
  Converted: "success",
  Lost: "danger",
  DoNotCall: "danger",
};

export function LeadsClient({
  partnerId,
  leads,
  agents,
  states,
  cities,
  activeFilters,
}: {
  partnerId: string;
  leads: Lead[];
  agents: Agent[];
  states: string[];
  cities: string[];
  activeFilters: { status: string; state: string; city: string; assignedToId: string; q: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showUpload, setShowUpload] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const boundImport = importLeadsAction.bind(null, partnerId);
  const boundCreate = createLeadAction.bind(null, partnerId);
  const boundAssign = assignLeadAction.bind(null, partnerId);

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  }

  function handleUpload(formData: FormData) {
    setError(null);
    setImportResult(null);
    startTransition(async () => {
      try {
        const result = await boundImport(formData);
        setImportResult(`Imported ${result.count} lead(s) into batch "${result.importBatch}".`);
        setShowUpload(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed");
      }
    });
  }

  function handleAssign(leadId: string, assignedToId: string) {
    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("assignedToId", assignedToId);
    startTransition(() => {
      boundAssign(formData);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowAdd((v) => !v)} className="btn-accent">
          + Add Lead
        </button>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg-sunken"
        >
          Upload CSV
        </button>
      </div>

      {error && <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}
      {importResult && (
        <div className="rounded-md border border-success bg-success-soft px-3 py-2 text-sm text-success">{importResult}</div>
      )}

      {showAdd && (
        <form
          action={(fd) => {
            setError(null);
            startTransition(async () => {
              try {
                await boundCreate(fd);
                setShowAdd(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to add lead");
              }
            });
          }}
          className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-bg-raised p-4 sm:grid-cols-3 lg:grid-cols-6"
        >
          <input name="name" placeholder="Name" className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <input
            name="phone"
            required
            placeholder="Phone *"
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          <input name="email" placeholder="Email" className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <input name="source" placeholder="Source" className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <input name="state" placeholder="State" className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <input name="city" placeholder="City" className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <button type="submit" disabled={isPending} className="btn-accent sm:col-span-3 lg:col-span-6 lg:w-fit">
            Save Lead
          </button>
        </form>
      )}

      {showUpload && (
        <form action={handleUpload} className="space-y-3 rounded-lg border border-border bg-bg-raised p-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              CSV file (columns: name, phone, email, source, state, city — phone is required)
            </label>
            <input type="file" name="file" accept=".csv" required className="text-sm text-text" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              name="batchLabel"
              placeholder="Batch label (optional)"
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
            <select name="agentIds" multiple className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-text-muted">
            Select one or more telecallers to auto-assign this batch round-robin (Ctrl/Cmd-click for multiple), or leave blank
            to assign manually later.
          </p>
          <button type="submit" disabled={isPending} className="btn-accent">
            {isPending ? "Uploading…" : "Upload & Import"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-bg-raised p-3">
        <input
          defaultValue={activeFilters.q}
          onKeyDown={(e) => {
            if (e.key === "Enter") setFilter("q", (e.target as HTMLInputElement).value);
          }}
          placeholder="Search name/phone/email, press Enter…"
          className="min-w-[200px] flex-1 rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text"
        />
        <select
          value={activeFilters.status}
          onChange={(e) => setFilter("status", e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={activeFilters.state}
          onChange={(e) => setFilter("state", e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={activeFilters.city}
          onChange={(e) => setFilter("city", e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={activeFilters.assignedToId}
          onChange={(e) => setFilter("assignedToId", e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
        >
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {(activeFilters.status || activeFilters.state || activeFilters.city || activeFilters.assignedToId || activeFilters.q) && (
          <button
            onClick={() => router.push("?")}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg-sunken"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-raised text-xs font-semibold uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">State / City</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Batch</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-text-muted">
                  No leads match these filters.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <Link href={`/partner/${partnerId}/telecalling/leads/${lead.id}`} className="font-semibold text-accent hover:underline">
                    {lead.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-text">{lead.phone}</td>
                <td className="px-3 py-2 text-text-muted">
                  {[lead.state, lead.city].filter(Boolean).join(" / ") || "—"}
                </td>
                <td className="px-3 py-2 text-text-muted">{lead.source ?? "—"}</td>
                <td className="px-3 py-2 text-text-muted">{lead.importBatch}</td>
                <td className="px-3 py-2">
                  <StatusChip label={lead.status} variant={STATUS_VARIANT[lead.status] ?? "neutral"} />
                </td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={lead.assignedToId ?? ""}
                    onChange={(e) => handleAssign(lead.id, e.target.value)}
                    className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
