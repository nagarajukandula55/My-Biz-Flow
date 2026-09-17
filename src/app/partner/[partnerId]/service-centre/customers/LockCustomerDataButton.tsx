"use client";

import { useTransition } from "react";
import { lockCustomerDataAction } from "./otpActions";

export function LockCustomerDataButton({ partnerId }: { partnerId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => {
        await lockCustomerDataAction(partnerId);
        window.location.reload();
      })}
      className="text-xs text-text-muted hover:text-accent disabled:opacity-50"
      title="Re-lock customer data now, before it stays unlocked for the full 30 minutes"
    >
      🔒 Lock now
    </button>
  );
}
