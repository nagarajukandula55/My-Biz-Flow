"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { logCallAction, sendTemplateAction } from "@/lib/telecalling/actions";
import { CALL_OUTCOMES } from "@/lib/telecalling/callsData";

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  state: string | null;
  city: string | null;
  status: string;
  notes: string | null;
};

type Template = { id: string; name: string; channel: string; category: string };

export function QueueClient({
  partnerId,
  agentId,
  leads,
  templates,
}: {
  partnerId: string;
  agentId: string;
  leads: Lead[];
  templates: Template[];
}) {
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [messageStatus, setMessageStatus] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const boundLogCall = logCallAction.bind(null, partnerId);
  const boundSendTemplate = sendTemplateAction.bind(null, partnerId);

  function handleSend(leadId: string, templateId: string) {
    if (!templateId) return;
    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("templateId", templateId);
    formData.set("sentById", agentId);
    startTransition(async () => {
      const result = await boundSendTemplate(formData);
      setMessageStatus((prev) => ({
        ...prev,
        [leadId]: result.status === "sent" ? "Message sent." : "Message queued (provider keys not configured yet — logged only).",
      }));
    });
  }

  return (
    <div className="space-y-4">
      {leads.length === 0 && <p className="text-sm text-text-muted">No leads in your queue right now.</p>}

      <div className="space-y-3">
        {leads.map((lead) => (
          <div key={lead.id} className="rounded-lg border border-border bg-bg-raised p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-text">{lead.name}</div>
                <div className="text-sm text-text-muted">
                  {lead.phone}
                  {[lead.state, lead.city].filter(Boolean).length ? ` · ${[lead.city, lead.state].filter(Boolean).join(", ")}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip label={lead.status} />
                <a href={`tel:${lead.phone}`} className="btn-accent">
                  Call
                </a>
                <button
                  onClick={() => setOpenLeadId(openLeadId === lead.id ? null : lead.id)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg-sunken"
                >
                  Log Outcome
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Send message:</span>
              {templates.length === 0 ? (
                <span className="text-xs text-text-muted">No templates yet — add one under Message Templates.</span>
              ) : (
                <select
                  defaultValue=""
                  onChange={(e) => handleSend(lead.id, e.target.value)}
                  disabled={isPending}
                  className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
                >
                  <option value="" disabled>
                    Choose a template…
                  </option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.channel})
                    </option>
                  ))}
                </select>
              )}
              {messageStatus[lead.id] && <span className="text-xs text-text-muted">{messageStatus[lead.id]}</span>}
            </div>

            {openLeadId === lead.id && (
              <form
                action={(fd) => {
                  fd.set("leadId", lead.id);
                  fd.set("agentId", agentId);
                  startTransition(async () => {
                    await boundLogCall(fd);
                    setOpenLeadId(null);
                  });
                }}
                className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-3"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Update status *
                  </label>
                  <select name="outcome" required className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text">
                    <option value="">Choose outcome…</option>
                    {CALL_OUTCOMES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Callback time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    name="callbackAt"
                    className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Remark</label>
                  <input
                    name="notes"
                    placeholder="What happened on the call…"
                    className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
                  />
                </div>
                <button type="submit" disabled={isPending} className="btn-accent sm:col-span-3 sm:w-fit">
                  Save Status & Remark
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
