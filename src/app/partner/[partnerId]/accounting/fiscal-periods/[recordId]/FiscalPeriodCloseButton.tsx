"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeFiscalPeriodAction, reopenFiscalPeriodAction } from "../../actions";

export function FiscalPeriodCloseButton({ partnerId, periodId, isClosed }: { partnerId: string; periodId: string; isClosed: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = isClosed
        ? await reopenFiscalPeriodAction(partnerId, periodId)
        : await closeFiscalPeriodAction(partnerId, periodId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button type="button" onClick={toggle} disabled={pending} className={isClosed ? "btn-outline" : "btn-accent"}>
        {pending ? "Working…" : isClosed ? "Reopen Period" : "Close Period"}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
