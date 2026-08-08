"use client";

import { useState, useTransition } from "react";
import { requestPasswordReset } from "./actions";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await requestPasswordReset(formData);
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="rounded-md border border-success-soft bg-success-soft p-3 text-sm font-semibold text-success">
        If that email has an account, a reset link has been sent (demo — no email service wired
        up yet; logged server-side only).
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="mt-6 flex flex-col gap-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Email
        <input
          type="email"
          name="email"
          required
          autoFocus
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
        />
      </label>
      <button type="submit" disabled={isPending} className="btn-accent mt-2 w-full">
        {isPending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
