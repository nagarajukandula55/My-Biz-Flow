"use client";

import { useTransition } from "react";
import { deleteAppointmentAction } from "../actions";

export function DeleteAppointmentButton({ partnerId, appointmentId, label }: { partnerId: string; appointmentId: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-outline text-danger"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete appointment "${label}"? This cannot be undone.`)) return;
        startTransition(async () => {
          await deleteAppointmentAction(partnerId, appointmentId);
        });
      }}
    >
      Delete
    </button>
  );
}
