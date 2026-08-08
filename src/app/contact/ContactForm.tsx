"use client";

import { useState, useTransition } from "react";
import { submitContactForm } from "./actions";

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await submitContactForm(formData);
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-success-soft bg-success-soft p-5 text-sm font-semibold text-success">
        Message sent (demo — no email service wired up yet; logged server-side only).
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name">
        <input
          name="name"
          required
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </Field>
      <Field label="Email">
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </Field>
      <Field label="Message">
        <textarea
          name="message"
          required
          rows={5}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </Field>
      <button type="submit" disabled={isPending} className="btn-accent self-start">
        {isPending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
