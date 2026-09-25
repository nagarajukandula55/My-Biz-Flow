"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPayslipStatusAction } from "./actions";

const NEXT_STATUS: Record<string, string | undefined> = {
  Draft: "Finalized",
  Finalized: "Paid",
};

export function PayslipStatusControls({ partnerId, payslipId, status }: { partnerId: string; payslipId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const next = NEXT_STATUS[status];
  if (!next) return null;

  function advance() {
    startTransition(async () => {
      const result = await setPayslipStatusAction(partnerId, payslipId, next!);
      if (result.error) {
        // eslint-disable-next-line no-alert
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button type="button" className="text-xs text-accent hover:underline" disabled={pending} onClick={advance}>
      Mark {next}
    </button>
  );
}
