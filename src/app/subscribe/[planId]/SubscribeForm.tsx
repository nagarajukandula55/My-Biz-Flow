"use client";

import Link from "next/link";

/**
 * Demo checkout — no payment gateway account/keys exist for this project.
 * This is an honest fake success flow (clearly labeled), not a half-wired
 * real integration with placeholder keys — see CLAUDE.md §5.
 */
export function SubscribeForm({ planId, partnerTypeId }: { planName: string; planId: string; partnerTypeId?: string }) {
  const href = partnerTypeId ? `/signup/${encodeURIComponent(partnerTypeId)}?planId=${encodeURIComponent(planId)}` : "/signup";
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">Create your business account first. After registration, you’ll be taken to the secure Razorpay checkout for this plan.</p>
      <Link href={href} className="btn-accent block w-full text-center">Create account and continue to payment</Link>
    </div>
  );
}
