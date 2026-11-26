import type { FormFieldDef } from "@/components/RecordForm";
import { INDIAN_STATES } from "@/lib/sample-data/geo";
export type HotelRoom = { name: string; roomType: string; capacity: number; ratePaise: number; status: "Ready" | "Dirty" | "Out of service"; taxRatePercent?: number; sac?: string; propertyState?: string };
export const hotelPaymentMethods = ["Cash", "Manual UPI", "Card", "Bank transfer", "Other"] as const;
export type FolioEntry = { reference: string; kind: "Charge" | "Payment" | "Refund"; label: string; amountPaise: number; at: string; payer?: string; paymentMethod?: typeof hotelPaymentMethods[number]; taxRatePercent?: number; sac?: string };
export type HotelStay = { roomId: string; roomName: string; guest: string; contact: string; guestAddress?: string; guestCity?: string; guestState?: string; guestPincode?: string; guestGstin?: string; guests: number; arrival: string; departure: string; ratePaise: number; taxRatePercent?: number; sac?: string; propertyState?: string; roomChargePaise: number; status: "Confirmed" | "Checked in" | "Checked out" | "Cancelled"; entries: FolioEntry[]; checkedInAt?: string; checkedOutAt?: string; invoiceType?: "GST" | "Non-GST"; invoiceId?: string; invoiceNumber?: string; invoices?: {payer:string;id:string;number:string}[]; roomMoves?: { fromRoomId: string; fromRoomName: string; toRoomId: string; toRoomName: string; at: string; reason: string }[]; groupId?: string; split?: { name: string; roomChargePaise: number; address?: string; city?:string; state?:string; pincode?:string; gstin?: string } };
export const hotelRoomFields: FormFieldDef[] = [
  {key:"name",label:"Room number / name",type:"text",required:true},
  {key:"roomType",label:"Room type",type:"text",required:true},
  {key:"capacity",label:"Maximum guests",type:"number",required:true},
  {key:"rateRupees",label:"Room rate per night (₹, agreed total including applicable taxes)",type:"currency",required:true},
  {key:"taxRatePercent",label:"Tax rate included in room rate (%)",type:"number",required:true},
  {key:"sac",label:"Accommodation SAC for GST invoices",type:"text"},
  {key:"propertyState",label:"Hotel property state",type:"select",options:[...INDIAN_STATES],required:true},
  {key:"status",label:"Housekeeping status",type:"select",options:["Ready","Dirty","Out of service"],required:true},
];
export function hotelMoney(value: unknown): number {
  const amount = Math.round(Number(value) * 100);
  if (value === "" || value == null || !Number.isSafeInteger(amount) || amount < 0 || amount > 2147483647) throw new Error("Enter a valid non-negative amount.");
  return amount;
}
export function hotelNights(arrival: string, departure: string): number {
  const valid = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0,10) === day;
  if (!valid(arrival) || !valid(departure)) throw new Error("Enter valid arrival and departure dates.");
  const nights = (Date.parse(departure) - Date.parse(arrival)) / 86400000;
  if (!Number.isInteger(nights) || nights < 1 || nights > 365) throw new Error("A reservation must be between 1 and 365 nights.");
  return nights;
}
export const hotelToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0,10);
export function hotelBalance(stay: HotelStay) {
  const charges = stay.roomChargePaise + stay.entries.filter(e=>e.kind === "Charge").reduce((n,e)=>n+e.amountPaise,0);
  const paid = stay.entries.reduce((n,e)=>n+(e.kind === "Payment" ? e.amountPaise : e.kind === "Refund" ? -e.amountPaise : 0),0);
  return { charges, paid, balance: charges - paid };
}
export function hotelPayerBalances(stay: HotelStay & { split?: { name: string; roomChargePaise: number } }) {
  const payers = stay.split ? ["Guest", stay.split.name] : ["Guest"];
  return payers.map(name => {
    const roomChargePaise = name === "Guest" ? stay.roomChargePaise - (stay.split?.roomChargePaise ?? 0) : stay.split!.roomChargePaise;
    return { name, ...hotelBalance({ ...stay, roomChargePaise, entries: stay.entries.filter(entry => (entry.payer ?? "Guest") === name) }) };
  });
}
export function parseHotelRoom(values: Record<string, unknown>): HotelRoom {
  const name = String(values.name ?? "").trim(), roomType = String(values.roomType ?? "").trim(), capacity = Number(values.capacity);
  const status = String(values.status ?? "Ready") as HotelRoom["status"];
  const taxRatePercent = values.taxRatePercent === undefined || values.taxRatePercent === "" ? undefined : Number(values.taxRatePercent);
  const sac = String(values.sac ?? "").trim();
  if (!name || name.length > 80 || !roomType || roomType.length > 100 || !Number.isInteger(capacity) || capacity < 1 || capacity > 50) throw new Error("Enter a room name, type and capacity from 1 to 50.");
  if (!["Ready","Dirty","Out of service"].includes(status)) throw new Error("Invalid housekeeping status.");
  if ((taxRatePercent !== undefined && (!Number.isInteger(taxRatePercent) || taxRatePercent < 0 || taxRatePercent > 100)) || sac.length > 20) throw new Error("Enter a whole tax percentage from 0 to 100 and a valid SAC.");
  const propertyState=String(values.propertyState??"").trim();
  if(propertyState&&!INDIAN_STATES.includes(propertyState as typeof INDIAN_STATES[number]))throw new Error("Select a valid Indian hotel property state.");
  return { name, roomType, capacity, ratePaise: hotelMoney(values.rateRupees), status, ...(taxRatePercent !== undefined ? { taxRatePercent } : {}), sac, ...(propertyState?{propertyState}:{}) };
}
