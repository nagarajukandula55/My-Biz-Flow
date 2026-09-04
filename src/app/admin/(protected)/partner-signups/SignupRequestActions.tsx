"use client";

import { useState, useTransition } from "react";
import { approveSignupRequestAction, rejectSignupRequestAction } from "./actions";

export function SignupRequestActions({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();
  const [approvedPartnerId, setApprovedPartnerId] = useState<string | null>(null);

  if (approvedPartnerId) {
    return <span className="text-sm font-semibold text-success">Approved — {approvedPartnerId}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="btn-accent"
        onClick={() => startTransition(async () => setApprovedPartnerId(await approveSignupRequestAction(requestId)))}
      >
        Approve
      </button>
      <button
        type="button"
        disabled={pending}
        className="btn-outline"
        onClick={() => startTransition(() => rejectSignupRequestAction(requestId))}
      >
        Reject
      </button>
    </div>
  );
}
