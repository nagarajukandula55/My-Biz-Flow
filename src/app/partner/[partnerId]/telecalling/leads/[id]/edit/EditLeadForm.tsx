"use client";

import { useState, useTransition } from "react";
import { updateLeadAction } from "@/lib/telecalling/actions";

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  state: string | null;
  city: string | null;
  notes: string | null;
};

export function EditLeadForm({ partnerId, lead }: { partnerId: string; lead: Lead }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const boundUpdate = updateLeadAction.bind(null, partnerId);

  return (
    <form
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          try {
            await boundUpdate(fd);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save changes");
          }
        });
      }}
      className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-border bg-bg-raised p-5 sm:grid-cols-2"
    >
      <input type="hidden" name="id" value={lead.id} />

      {error && (
        <div className="sm:col-span-2 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
        Name
        <input
          name="name"
          defaultValue={lead.name}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
        />
      </label>

      <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
        Phone *
        <input
          name="phone"
          required
          defaultValue={lead.phone}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
        />
      </label>

      <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
        Email
        <input
          name="email"
          defaultValue={lead.email ?? ""}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
        />
      </label>

      <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
        Source
        <input
          name="source"
          defaultValue={lead.source ?? ""}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
        />
      </label>

      <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
        State
        <input
          name="state"
          defaultValue={lead.state ?? ""}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
        />
      </label>

      <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
        City
        <input
          name="city"
          defaultValue={lead.city ?? ""}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
        />
      </label>

      <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted sm:col-span-2">
        Notes
        <textarea
          name="notes"
          defaultValue={lead.notes ?? ""}
          rows={3}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
        />
      </label>

      <div className="sm:col-span-2 flex justify-end">
        <button type="submit" disabled={isPending} className="btn-accent">
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
