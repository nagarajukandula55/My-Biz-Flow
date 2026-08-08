"use client";

import { useMemo, useState, useTransition } from "react";
import type { SchemaField } from "@/lib/designer/fieldSchema";
import { saveDocumentTemplateAction } from "@/lib/designer/actions";
import { renderTemplate } from "@/lib/designer/renderTemplate";

const DEFAULT_STARTER = `<dl style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
  <!-- Click a placeholder below to insert it here -->
</dl>`;

export function DesignerDocumentEditor({
  pageId,
  availableFields,
  initialTemplate,
  sampleRecord,
}: {
  pageId: string;
  availableFields: SchemaField[];
  initialTemplate: string;
  sampleRecord: Record<string, unknown>;
}) {
  const [template, setTemplate] = useState(initialTemplate || DEFAULT_STARTER);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const preview = useMemo(() => renderTemplate(template, sampleRecord), [template, sampleRecord]);

  function insertPlaceholder(key: string) {
    setTemplate((t) => `${t}\n{{${key}}}`);
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveDocumentTemplateAction(pageId, template);
      setSaved(true);
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-text">Document template</h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs font-semibold text-success">Saved</span>}
          <button type="button" onClick={handleSave} disabled={isPending} className="btn-accent">
            {isPending ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>
      <p className="mt-1 max-w-[65ch] text-xs text-text-muted">
        Click a placeholder to insert it at the end of the template, then move it in the text
        area. HTML is rendered as-is; every {"{{placeholder}}"} value is HTML-escaped on
        substitution.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {availableFields.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => insertPlaceholder(f.key)}
            className="rounded-full border border-border bg-bg px-2.5 py-1 text-[11px] font-mono font-medium text-teal hover:bg-teal-soft"
          >
            {`{{${f.key}}}`}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Template HTML
          </div>
          <textarea
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              setSaved(false);
            }}
            rows={16}
            className="w-full resize-y rounded-md border border-border bg-bg p-3 font-mono text-xs text-text outline-none focus:border-accent"
            spellCheck={false}
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Live preview — sample record
          </div>
          <div
            className="h-full min-h-[280px] overflow-auto rounded-md border border-border bg-bg-sunken p-4 text-sm text-text"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      </div>
    </div>
  );
}
