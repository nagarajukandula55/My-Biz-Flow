"use client";

import { useTransition } from "react";
import { convertQuotationToInvoice } from "./actions";

export function ConvertQuotationButton({ partnerId, quotationId }: { partnerId: string; quotationId: string }) {
  const [pending, startTransition] = useTransition();
  return <button type="button" className="btn-accent" disabled={pending} onClick={() => startTransition(() => convertQuotationToInvoice(partnerId, quotationId))}>{pending ? "Creating…" : "Convert to Invoice"}</button>;
}
