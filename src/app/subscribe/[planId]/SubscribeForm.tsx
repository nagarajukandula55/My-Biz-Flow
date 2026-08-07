"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

/**
 * Demo checkout — no payment gateway account/keys exist for this project.
 * This is an honest fake success flow (clearly labeled), not a half-wired
 * real integration with placeholder keys — see CLAUDE.md §5.
 */
export function SubscribeForm({ planName }: { planName: string }) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // eslint-disable-next-line no-console
    console.log("Simulated payment submitted (demo, no real gateway):", planName);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-success-soft bg-success-soft p-6 text-center">
        <div className="font-display text-lg font-bold text-success">Payment simulated successfully</div>
        <p className="mt-2 text-sm text-text-muted">
          This is a demo success state — no real charge occurred, no payment gateway is wired up. In a real build
          this is where a webhook-confirmed subscription record would be created.
        </p>
        <Link href="/login" className="btn-accent mt-4 inline-block">
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Name
        <input
          type="text"
          required
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Email
        <input
          type="email"
          required
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
        />
      </label>
      <button type="submit" className="btn-accent w-full">
        Simulate payment (demo — no real gateway wired up)
      </button>
    </form>
  );
}
