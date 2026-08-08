"use client";

import { useState, useTransition } from "react";
import { approveSignupRequestAction, rejectSignupRequestAction } from "./actions";

export function SignupRequestActions({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();
  const [approvedVendorId, setApprovedVendorId] = useState<string | null>(null);

  if (approvedVendorId) {
    return <span className="text-sm font-semibold text-success">Approved — {approvedVendorId}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="btn-accent"
        onClick={() => startTransition(async () => setApprovedVendorId(await approveSignupRequestAction(requestId)))}
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
