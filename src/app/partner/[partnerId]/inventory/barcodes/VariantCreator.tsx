"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBarcodeVariantAction } from "./actions";

export function VariantCreator({ partnerId, materialId }: { partnerId: string; materialId: string }) {
  const router = useRouter(); const [variant, setVariant] = useState(""); const [packSize, setPackSize] = useState(""); const [message, setMessage] = useState(""); const [pending, startTransition] = useTransition();
  const create = () => startTransition(async () => { try { const result = await createBarcodeVariantAction(partnerId, materialId, variant, packSize); router.push(`/partner/${partnerId}/inventory/bom/${result.id}`); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create variant."); } });
  return <div className="mt-3 rounded-md border border-border bg-bg-raised p-3"><p className="text-xs font-semibold text-text">Create stock variant</p><p className="mt-1 text-xs text-text-muted">Creates a separate material/stock row so this size, colour or pack can receive its own barcode and inventory quantity.</p><div className="mt-2 flex flex-wrap gap-2"><input value={variant} onChange={(event) => setVariant(event.target.value)} placeholder="e.g. Blue / 500 g / XL" className="rounded border bg-bg px-2 py-1 text-sm" /><input value={packSize} onChange={(event) => setPackSize(event.target.value)} placeholder="Pack size (optional)" className="rounded border bg-bg px-2 py-1 text-sm" /><button type="button" onClick={create} disabled={pending} className="btn-outline text-xs">{pending ? "Creating." : "Create variant"}</button></div>{message && <p className="mt-2 text-xs text-danger">{message}</p>}</div>;
}
