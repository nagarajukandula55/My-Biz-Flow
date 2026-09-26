"use client";

import { useTransition } from "react";
import { deleteTripAction } from "./actions";

export function DeleteTripButton({ partnerId, tripId, recordLabel }: { partnerId: string; tripId: string; recordLabel: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-outline text-danger"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete trip "${recordLabel}"? This cannot be undone.`)) return;
        startTransition(async () => {
          await deleteTripAction(partnerId, tripId);
        });
      }}
    >
      Delete
    </button>
  );
}
