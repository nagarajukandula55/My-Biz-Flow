"use client";

import { useState, useTransition } from "react";
import { setInteriorProjectStatus, createInteriorProgressInvoice, consumeApprovedInteriorBoq } from "./actions";

export function StatusActions({ partnerId, recordId, status, stockConsumed }: { partnerId: string; recordId: string; status: string; stockConsumed?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (work: () => Promise<unknown>) => start(async () => {
    setError("");
    try { await work(); window.location.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The update could not be saved."); }
  });
  const bill = () => {
    const raw = window.prompt("Total project progress percentage reached (the new portion will be billed)", "25");
    if (raw !== null) run(() => createInteriorProgressInvoice(partnerId, recordId, Number(raw)));
  };
  return <div>
    <div className="flex flex-wrap gap-2">
      {status === "Draft" && <button disabled={pending} onClick={() => run(() => setInteriorProjectStatus(partnerId, recordId, "Submitted"))} className="btn-outline">Submit BOQ</button>}
      {status === "Submitted" && <button disabled={pending} onClick={() => run(() => setInteriorProjectStatus(partnerId, recordId, "Approved"))} className="btn-accent">Approve BOQ</button>}
      {status === "Approved" && <button disabled={pending} onClick={() => run(() => setInteriorProjectStatus(partnerId, recordId, "In Progress"))} className="btn-outline">Start Work</button>}
      {["Approved", "In Progress", "Partially Billed"].includes(status) && <button disabled={pending} onClick={bill} className="btn-accent">Create Progress Invoice</button>}
      {["Approved", "In Progress", "Partially Billed"].includes(status) && !stockConsumed && <button disabled={pending} onClick={() => run(() => consumeApprovedInteriorBoq(partnerId, recordId))} className="btn-outline">Consume BOQ Stock</button>}
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </div>;
}
