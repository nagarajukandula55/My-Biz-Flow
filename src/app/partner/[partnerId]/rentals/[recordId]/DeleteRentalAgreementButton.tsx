"use client";

import { useTransition } from "react";
import { deleteAgreementAction } from "../actions";

export function DeleteRentalAgreementButton({ partnerId, agreementId, label }: { partnerId: string; agreementId: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-outline text-danger"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete booking "${label}"? This cannot be undone.`)) return;
        startTransition(async () => {
          await deleteAgreementAction(partnerId, agreementId);
        });
      }}
    >
      Delete
    </button>
  );
}
