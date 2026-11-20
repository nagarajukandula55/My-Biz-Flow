"use client";

import { useState, useTransition } from "react";
import { BarcodeLabel } from "@/components/inventory/BarcodeLabel";
import { LABEL_PRESETS, type BarcodeSettings } from "@/lib/barcodes";
import { saveBarcodeSettingsAction } from "./actions";

export function BarcodeSettingsForm({ partnerId, settings }: { partnerId: string; settings: BarcodeSettings }) {
  const [state, setState] = useState(settings); const [notice, setNotice] = useState(""); const [pending, startTransition] = useTransition();
  const set = (key: keyof BarcodeSettings, value: unknown) => setState((old) => ({ ...old, [key]: value }));
  const submit = () => startTransition(async () => { try { await saveBarcodeSettingsAction(partnerId, state as unknown as Record<string, unknown>); setNotice("Barcode settings saved."); } catch (e) { setNotice(e instanceof Error ? e.message : "Could not save barcode settings."); } });
  const sample = `${state.prefix || "SKU"}-${String(state.nextSequence || state.sequenceStart).padStart(state.length || 6, "0")}`;
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
    <section className="space-y-4 rounded-lg border border-border bg-bg-raised p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Series prefix<input value={state.prefix} onChange={e => set("prefix", e.target.value)} className="mt-1 w-full rounded border bg-bg p-2" placeholder="e.g. SHOP" /></label>
        <label className="text-sm">Starting number<input type="number" min="1" value={state.sequenceStart} onChange={e => set("sequenceStart", Number(e.target.value))} className="mt-1 w-full rounded border bg-bg p-2" /></label>
        <label className="text-sm">Next number<input type="number" min="1" value={state.nextSequence} onChange={e => set("nextSequence", Number(e.target.value))} className="mt-1 w-full rounded border bg-bg p-2" /></label>
        <label className="text-sm">Number length<input type="number" min="1" max="18" value={state.length} onChange={e => set("length", Number(e.target.value))} className="mt-1 w-full rounded border bg-bg p-2" /></label>
        <label className="text-sm">Barcode type<select value={state.barcodeType} onChange={e => set("barcodeType", e.target.value)} className="mt-1 w-full rounded border bg-bg p-2"><option value="CODE128">Code 128 (internal series)</option><option value="EAN13">EAN-13 (GS1 supplied)</option></select></label>
        <label className="text-sm">Price display<select value={state.priceDisplay} onChange={e => set("priceDisplay", e.target.value)} className="mt-1 w-full rounded border bg-bg p-2"><option value="BOTH">MRP and offer price</option><option value="MRP">MRP only</option><option value="SALE">Offer price only</option><option value="NONE">Hide prices</option></select></label>
        <label className="text-sm">Printer label preset<select value={state.labelPreset ?? "CUSTOM"} onChange={e => { const preset = e.target.value as keyof typeof LABEL_PRESETS; set("labelPreset", preset); if (preset !== "CUSTOM") { set("labelWidthMm", LABEL_PRESETS[preset].widthMm); set("labelHeightMm", LABEL_PRESETS[preset].heightMm); } }} className="mt-1 w-full rounded border bg-bg p-2">{Object.entries(LABEL_PRESETS).map(([key, preset]) => <option key={key} value={key}>{preset.label}</option>)}</select></label>
        <label className="text-sm">Label width (mm)<input type="number" min="25" max="210" value={state.labelWidthMm} onChange={e => { set("labelPreset", "CUSTOM"); set("labelWidthMm", Number(e.target.value)); }} className="mt-1 w-full rounded border bg-bg p-2" /></label>
        <label className="text-sm">Label height (mm)<input type="number" min="20" max="297" value={state.labelHeightMm} onChange={e => { set("labelPreset", "CUSTOM"); set("labelHeightMm", Number(e.target.value)); }} className="mt-1 w-full rounded border bg-bg p-2" /></label>
      </div>
      <fieldset><legend className="text-sm font-medium">Fields to print</legend><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{[["description", "Product name"], ["variant", "Variant"], ["packSize", "Pack size"], ["mrp", "MRP"], ["offerPrice", "Offer price"], ["batchNumber", "Batch"], ["manufacturedOn", "Mfg. date"], ["expiryDate", "Expiry"], ["labelNote", "Label note"], ["barcode", "Barcode number"]].map(([key, label]) => <label key={key} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={state.labelFields.includes(key)} onChange={e => set("labelFields", e.target.checked ? [...state.labelFields, key] : state.labelFields.filter(value => value !== key))} />{label}</label>)}</div></fieldset>
      <p className="text-xs text-text-muted">Generated preview: <strong>{sample}</strong>. EAN-13 is reserved for a valid GS1-issued product number; it is never generated from this internal series.</p>
      {notice && <p className="text-sm text-accent">{notice}</p>}
      <button type="button" onClick={submit} disabled={pending} className="btn-accent">{pending ? "Saving…" : "Save barcode settings"}</button>
    </section>
    <aside className="rounded-lg border border-border bg-bg-raised p-5"><h2 className="mb-3 font-display font-bold">Live label preview</h2><BarcodeLabel label={{ code: state.barcodeType === "EAN13" ? "8901234567890" : sample, type: state.barcodeType, description: "Sample Product", variant: "Blue", packSize: "500 g", mrp: 250, offerPrice: 200, widthMm: state.labelWidthMm, heightMm: state.labelHeightMm, priceDisplay: state.priceDisplay, fields: state.labelFields }} /></aside>
  </div>;
}
