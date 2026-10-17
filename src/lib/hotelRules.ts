import type { FormFieldDef } from "@/components/RecordForm";
export type HotelRoom = { name: string; roomType: string; capacity: number; ratePaise: number; status: "Ready" | "Dirty" | "Out of service" };
export const hotelPaymentMethods = ["Cash", "Manual UPI", "Card", "Bank transfer", "Other"] as const;
export type FolioEntry = { reference: string; kind: "Charge" | "Payment" | "Refund"; label: string; amountPaise: number; at: string; payer?: string; paymentMethod?: typeof hotelPaymentMethods[number] };
export type HotelStay = { roomId: string; roomName: string; guest: string; contact: string; guests: number; arrival: string; departure: string; ratePaise: number; roomChargePaise: number; status: "Confirmed" | "Checked in" | "Checked out" | "Cancelled"; entries: FolioEntry[]; checkedInAt?: string; checkedOutAt?: string; roomMoves?: { fromRoomId: string; fromRoomName: string; toRoomId: string; toRoomName: string; at: string; reason: string }[]; groupId?: string; split?: { name: string; roomChargePaise: number } };
export const hotelRoomFields: FormFieldDef[] = [
  {key:"name",label:"Room number / name",type:"text",required:true},
  {key:"roomType",label:"Room type",type:"text",required:true},
  {key:"capacity",label:"Maximum guests",type:"number",required:true},
  {key:"rateRupees",label:"Room rate per night (₹, agreed total including applicable taxes)",type:"currency",required:true},
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
  if (!name || name.length > 80 || !roomType || roomType.length > 100 || !Number.isInteger(capacity) || capacity < 1 || capacity > 50) throw new Error("Enter a room name, type and capacity from 1 to 50.");
  if (!["Ready","Dirty","Out of service"].includes(status)) throw new Error("Invalid housekeeping status.");
  return { name, roomType, capacity, ratePaise: hotelMoney(values.rateRupees), status };
}
