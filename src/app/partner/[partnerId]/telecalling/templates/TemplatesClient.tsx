"use client";

import { useState, useTransition } from "react";
import { createTemplateAction, deleteTemplateAction } from "@/lib/telecalling/actions";
import { TEMPLATE_CATEGORIES } from "@/lib/telecalling/templatesData";

type Template = {
  id: string;
  name: string;
  channel: string;
  category: string;
  body: string;
};

export function TemplatesClient({ partnerId, templates }: { partnerId: string; templates: Template[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const boundCreate = createTemplateAction.bind(null, partnerId);
  const boundDelete = deleteTemplateAction.bind(null, partnerId);

  return (
    <div className="space-y-4">
      <button onClick={() => setShowAdd((v) => !v)} className="btn-accent">
        + New Template
      </button>

      {error && <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

      {showAdd && (
        <form
          action={(fd) => {
            setError(null);
            startTransition(async () => {
              try {
                await boundCreate(fd);
                setShowAdd(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to save template");
              }
            });
          }}
          className="space-y-3 rounded-lg border border-border bg-bg-raised p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              name="name"
              required
              placeholder="Template name *"
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
            <select name="channel" className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <select name="category" className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <textarea
            name="body"
            required
            rows={4}
            placeholder="Hi {{name}}, welcome! Check our products here: {{link}}"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          <button type="submit" disabled={isPending} className="btn-accent">
            Save Template
          </button>
        </form>
      )}

      <div className="space-y-3">
        {templates.length === 0 && <p className="text-sm text-text-muted">No templates yet — add a Welcome message to start.</p>}
        {templates.map((t) => (
          <div key={t.id} className="rounded-lg border border-border bg-bg-raised p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-text">
                  {t.name} <span className="ml-2 rounded-full bg-bg-sunken px-2 py-0.5 text-xs text-text-muted">{t.channel}</span>{" "}
                  <span className="rounded-full bg-bg-sunken px-2 py-0.5 text-xs text-text-muted">{t.category}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-muted">{t.body}</p>
              </div>
              <form
                action={(fd) => {
                  fd.set("id", t.id);
                  startTransition(() => {
                    boundDelete(fd);
                  });
                }}
              >
                <button type="submit" className="text-sm font-semibold text-danger hover:underline">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
