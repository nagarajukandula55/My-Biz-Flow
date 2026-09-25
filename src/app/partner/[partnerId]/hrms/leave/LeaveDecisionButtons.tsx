"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideLeaveRequestAction } from "./actions";

export function LeaveDecisionButtons({ partnerId, leaveId }: { partnerId: string; leaveId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function decide(decision: "Approved" | "Rejected") {
    startTransition(async () => {
      const result = await decideLeaveRequestAction(partnerId, leaveId, decision);
      if (result.error) {
        // eslint-disable-next-line no-alert
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" className="text-xs text-success hover:underline" disabled={pending} onClick={() => decide("Approved")}>
        Approve
      </button>
      <button type="button" className="text-xs text-danger hover:underline" disabled={pending} onClick={() => decide("Rejected")}>
        Reject
      </button>
    </div>
  );
}
