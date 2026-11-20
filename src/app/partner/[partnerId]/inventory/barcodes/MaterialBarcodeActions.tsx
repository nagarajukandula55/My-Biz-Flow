"use client";

import { useState, useTransition } from "react";
import { BarcodeLabel } from "@/components/inventory/BarcodeLabel";
import type { BarcodeSettings } from "@/lib/barcodes";
import { generateBarcodeAction, recordBarcodePrintAction } from "./actions";

export function MaterialBarcodeActions({ partnerId, material, settings }: { partnerId: string; material: Record<string, unknown>; settings: BarcodeSettings }) {
  const [code, setCode] = useState(String(material.barcode ?? "")); const [message, setMessage] = useState(""); const [pending, startTransition] = useTransition();
  const type = (material.barcodeType || settings.barcodeType) as BarcodeSettings["barcodeType"];
  const generate = () => startTransition(async () => { try { const result = await generateBarcodeAction(partnerId, String(material.id)); setCode(result.barcode); setMessage("Barcode generated. Refreshing material details…"); window.location.reload(); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not generate a barcode."); } });
  const print = () => { if (code) void recordBarcodePrintAction(partnerId, [String(material.id)], 1, "single"); document.body.classList.add("printing-barcode-label"); window.print(); window.setTimeout(() => document.body.classList.remove("printing-barcode-label"), 500); };
  return <div className="space-y-2"><div className="flex flex-wrap gap-2">{!code && <button className="btn-accent" disabled={pending} onClick={generate}>{pending ? "Generating…" : "Generate barcode"}</button>}{code && <button className="btn-outline" onClick={print}>Print label</button>}</div>{message && <p className="text-xs text-danger">{message}</p>}{code && <div className="single-barcode-print print:fixed print:left-0 print:top-0"><BarcodeLabel label={{ code, type, description: String(material.description ?? material.id), variant: String(material.variant ?? ""), packSize: String(material.packSize ?? ""), mrp: Number(material.mrp ?? 0), offerPrice: Number(material.offerPrice ?? material.mrp ?? 0), batchNumber: String(material.batchNumber ?? ""), manufacturedOn: String(material.manufacturedOn ?? ""), expiryDate: String(material.expiryDate ?? ""), labelNote: String(material.labelNote ?? ""), widthMm: settings.labelWidthMm, heightMm: settings.labelHeightMm, priceDisplay: settings.priceDisplay, fields: settings.labelFields }} /></div>}</div>;
}
