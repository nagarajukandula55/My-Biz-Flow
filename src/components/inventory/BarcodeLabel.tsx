"use client";

import { barcodeBits, type BarcodeType, type PriceDisplay } from "@/lib/barcodes";

export type BarcodeLabelData = {
  code: string; type: BarcodeType; description: string; variant?: string; packSize?: string;
  mrp?: number; offerPrice?: number; widthMm: number; heightMm: number; priceDisplay: PriceDisplay; fields?: string[];
  batchNumber?: string; manufacturedOn?: string; expiryDate?: string; labelNote?: string;
};

export function BarcodeLabel({ label }: { label: BarcodeLabelData }) {
  const bits = barcodeBits(label.code, label.type);
  const fields = label.fields ?? ["description", "variant", "packSize", "mrp", "offerPrice", "barcode"];
  return <article className="barcode-label bg-white text-black" style={{ width: `${label.widthMm}mm`, minHeight: `${label.heightMm}mm` }}>
    {fields.includes("description") && <div className="truncate text-[10px] font-bold leading-tight">{label.description}</div>}
    {(fields.includes("variant") || fields.includes("packSize")) && (label.variant || label.packSize) && <div className="truncate text-[8px] leading-tight">{[fields.includes("variant") ? label.variant : "", fields.includes("packSize") ? label.packSize : ""].filter(Boolean).join(" · ")}</div>}
    <div className="text-[7px] leading-tight">{fields.includes("batchNumber") && label.batchNumber ? `Batch: ${label.batchNumber}` : ""}{fields.includes("manufacturedOn") && label.manufacturedOn ? ` Mfg: ${label.manufacturedOn}` : ""}{fields.includes("expiryDate") && label.expiryDate ? ` Exp: ${label.expiryDate}` : ""}</div>
    {fields.includes("labelNote") && label.labelNote && <div className="truncate text-[7px] leading-tight">{label.labelNote}</div>}
    <svg viewBox={`0 0 ${bits.length} 42`} role="img" aria-label={`Barcode ${label.code}`} className="mt-1 h-9 w-full" preserveAspectRatio="none">
      <rect width={bits.length} height="42" fill="white" />
      {[...bits].map((bit, index) => bit === "1" ? <rect key={index} x={index} y="0" width="1" height="35" fill="black" /> : null)}
      {fields.includes("barcode") && <text x={bits.length / 2} y="41" textAnchor="middle" fontSize="8" fontFamily="monospace">{label.code}</text>}
    </svg>
    {label.priceDisplay !== "NONE" && <div className="flex justify-between text-[9px] font-bold leading-tight">
      {fields.includes("mrp") && (label.priceDisplay === "MRP" || label.priceDisplay === "BOTH") && <span>MRP ₹{Number(label.mrp ?? 0).toFixed(2)}</span>}
      {fields.includes("offerPrice") && (label.priceDisplay === "SALE" || label.priceDisplay === "BOTH") && <span>Offer ₹{Number(label.offerPrice ?? label.mrp ?? 0).toFixed(2)}</span>}
    </div>}
  </article>;
}
