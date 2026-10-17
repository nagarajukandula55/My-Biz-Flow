"use client";
import { useState } from "react";
import { RecordForm, type FormFieldDef, type RecordFormAction } from "./RecordForm";

/** Adds optional per-item prices to the shared form without losing entered booking values. */
export function RentalBookingForm({ fields, initialValues, assets, action }: {
  fields: FormFieldDef[]; initialValues?: Record<string, unknown>;
  assets: { id: string; assetName: string }[]; action?: RecordFormAction;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const extraFields: FormFieldDef[] = selected.flatMap(id => {
    const asset = assets.find(item => item.id === id);
    if (!asset) return [];
    const section = `${asset.assetName} — optional quantity and price overrides`;
    return [
      { key: `line:${id}:quantity`, label: "Quantity", type: "number", section, help: "Blank uses the main quantity. Record partial pickups and returns on the booking detail." },
      { key: `line:${id}:deposit`, label: "Deposit (₹)", type: "currency", section, help: "Leave blank to use the main deposit. Enter 0 for no deposit." },
      { key: `line:${id}:fixed`, label: "Fixed quote (₹)", type: "currency", section, help: "Used only with Fixed quote pricing. Blank uses the main quote." },
      { key: `line:${id}:rate`, label: "Rate per period (₹)", type: "currency", section, help: "Uses the main pricing period. Blank uses the main rate." },
    ];
  });
  return <RecordForm fields={[...fields, ...extraFields]} initialValues={initialValues} submitLabel="Create Booking" action={action}
    onValuesChange={values => { const next = Array.isArray(values.additionalAssetIds) ? values.additionalAssetIds.filter((id): id is string => typeof id === "string").slice(0,19) : []; setSelected(previous => previous.join("|") === next.join("|") ? previous : next); }} />;
}
