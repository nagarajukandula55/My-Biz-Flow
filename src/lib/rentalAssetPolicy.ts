import type { FormFieldDef } from "@/components/RecordForm";
export type RentalAssetPolicy = { turnaroundMinutes: number; maintenanceStart: string; maintenanceEnd: string; maintenanceNotes: string; stockQuantity?: number };
export const rentalAssetPolicyFields: FormFieldDef[] = [
  { key: "stockQuantity", label: "Units available in this asset pool", type: "number", help: "1 for an individually tracked asset; up to 10,000 interchangeable units. Maintenance blocks the entire pool. Pooled bookings support partial pickup and return records." },
  { key: "turnaroundMinutes", label: "Cleaning / preparation time after each booking (minutes)", type: "number", help: "0 to 10080 minutes. This time also blocks the next booking." },
  { key: "maintenanceStart", label: "Maintenance starts (IST)", type: "datetime" },
  { key: "maintenanceEnd", label: "Maintenance ends (IST)", type: "datetime" },
  { key: "maintenanceNotes", label: "Maintenance / inspection notes", type: "textarea" },
];
export function readRentalAssetPolicy(values: Record<string, unknown>): RentalAssetPolicy {
  const stockQuantity = rentalQuantity(values.stockQuantity);
  const turnaroundMinutes = Number(values.turnaroundMinutes ?? 0);
  if (!Number.isInteger(turnaroundMinutes) || turnaroundMinutes < 0 || turnaroundMinutes > 10080) throw new Error("Preparation time must be 0 to 10080 whole minutes.");
  const date = (value: unknown) => {
    if (!value) return "";
    const text = String(value);
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text) ? `${text}:00+05:30` : text);
    if (!Number.isFinite(parsed.getTime())) throw new Error("Enter valid maintenance dates.");
    return parsed.toISOString();
  };
  const maintenanceStart = date(values.maintenanceStart), maintenanceEnd = date(values.maintenanceEnd);
  if (!!maintenanceStart !== !!maintenanceEnd || (maintenanceStart && maintenanceEnd <= maintenanceStart)) throw new Error("Maintenance end must be after its start; supply both dates or neither.");
  const maintenanceNotes = String(values.maintenanceNotes ?? "").trim();
  if (maintenanceNotes.length > 4000) throw new Error("Maintenance notes must be 4000 characters or fewer.");
  return { turnaroundMinutes, maintenanceStart, maintenanceEnd, maintenanceNotes, stockQuantity };
}
export function rentalQuantity(value: unknown): number {
  const quantity = value === undefined || value === null || value === "" ? 1 : Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error("Quantity must be a whole number from 1 to 10,000.");
  return quantity;
}
/** End-exclusive intervals: adjacent reservations can share capacity when preparation is complete. */
export function exceedsRentalCapacity(capacity: number, windows: { start: number; end: number; quantity: number }[]) {
  const events = windows.flatMap(window => [{ at: window.start, change: window.quantity }, { at: window.end, change: -window.quantity }]);
  events.sort((a, b) => a.at - b.at || a.change - b.change);
  let used = 0;
  for (const event of events) { used += event.change; if (used > capacity) return true; }
  return false;
}
export const rentalLocalDateTime = (value: string) => value ? new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0,16) : "";
