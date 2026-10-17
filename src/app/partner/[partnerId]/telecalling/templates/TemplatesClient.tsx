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
  metaTemplateName: string | null;
};

/**
 * Ready-to-use WhatsApp copy an agent can add with one click instead of
 * starting from a blank textarea — WhatsApp's own markdown (*bold*, line
 * breaks, emoji) is the only "nice looking" available in a plain text
 * message (no rich HTML), so these lean on that. {{name}} is filled from
 * the lead's own name at send time (see fillTemplate/sendTemplateToLead);
 * {{link}} is filled from the "Link (optional)" field on the send button
 * in the Queue, or left blank if not given.
 */
const SUGGESTED_WHATSAPP_TEMPLATES: { name: string; category: string; body: string }[] = [
  {
    name: "Welcome & Introduction",
    category: "Welcome",
    body:
      "👋 Hi {{name}}!\n\nThanks for connecting with *My Biz Flow* — we help businesses like yours manage billing, inventory, service and more, all in one place.\n\n✨ Take a quick look here: {{link}}\n\nWe'd love to help you get started — just reply here anytime!",
  },
  {
    name: "Special Offer",
    category: "ProductInfo",
    body:
      "🎉 Hi {{name}}, great news!\n\nAs a valued lead, you get *early access* to My Biz Flow — no setup fees.\n\n👉 Explore now: {{link}}\n\nQuestions? Just reply here, we're happy to help!",
  },
  {
    name: "Follow-up After Call",
    category: "FollowUp",
    body:
      "Hi {{name}}, thanks for taking the time to speak with us today! 🙏\n\nAs promised, here's the link to learn more: {{link}}\n\nLet us know if you have any questions — we're here to help you get started.",
  },
];

export function TemplatesClient({ partnerId, templates }: { partnerId: string; templates: Template[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Prefills the manual "+ New Template" form below — a suggested template
  // can no longer be added with one click now that a WhatsApp template
  // needs its real Meta-approved name (which only the partner knows,
  // nothing here can guess it), so "Add this template" now just opens the
  // form with name/category/body filled in and waits for that one field.
  const [prefill, setPrefill] = useState<{ name: string; category: string; body: string } | null>(null);

  const boundCreate = createTemplateAction.bind(null, partnerId);
  const boundDelete = deleteTemplateAction.bind(null, partnerId);

  function addSuggested(suggestion: (typeof SUGGESTED_WHATSAPP_TEMPLATES)[number]) {
    setError(null);
    setPrefill(suggestion);
    setShowAdd(true);
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setShowAdd((v) => !v)} className="btn-accent">
        + New Template
      </button>

      {error && <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

      {templates.every((t) => t.channel !== "whatsapp") && (
        <div className="rounded-lg border border-border bg-bg-raised p-4">
          <div className="text-sm font-semibold text-text">Suggested WhatsApp templates</div>
          <p className="mt-0.5 text-xs text-text-muted">
            Add one with a click, then edit the wording to fit your business.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SUGGESTED_WHATSAPP_TEMPLATES.map((s) => (
              <div key={s.name} className="rounded-md border border-border bg-bg p-3">
                <div className="text-sm font-semibold text-text">{s.name}</div>
                <p className="mt-1 whitespace-pre-wrap text-xs text-text-muted">{s.body}</p>
                <button
                  type="button"
                  onClick={() => addSuggested(s)}
                  disabled={isPending}
                  className="btn-accent mt-3 w-full text-sm"
                >
                  + Add this template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <form
          action={(fd) => {
            setError(null);
            startTransition(async () => {
              try {
                await boundCreate(fd);
                setShowAdd(false);
                setPrefill(null);
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
              defaultValue={prefill?.name}
              placeholder="Template name *"
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
            <select name="channel" defaultValue={prefill ? "whatsapp" : "sms"} className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <select name="category" defaultValue={prefill?.category} className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
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
            defaultValue={prefill?.body}
            placeholder="Hi {{name}}, welcome! Check our products here: {{link}}"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          <input
            name="metaTemplateName"
            placeholder="Meta-approved WhatsApp template name (required for WhatsApp)"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          <p className="text-xs text-text-muted">
            Only for WhatsApp — the exact template name approved in Meta Business Manager &gt; WhatsApp Manager &gt;
            Message Templates. The {"{{tokens}}"} above must appear in the same order as that template's variables.
          </p>
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
                {t.channel === "whatsapp" && (
                  <p className="mt-1 text-xs text-text-muted">
                    Meta template:{" "}
                    {t.metaTemplateName ? (
                      <span className="font-mono text-text">{t.metaTemplateName}</span>
                    ) : (
                      <span className="font-semibold text-danger">not set — this template can't be sent</span>
                    )}
                  </p>
                )}
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
