import type { FormFieldDef } from "@/components/RecordForm";

export const RENTAL_CATEGORIES = ["General equipment", "Construction and tools", "Vehicles and bikes", "Cameras and AV", "Events and furniture", "Clothing and costumes", "Sports and recreation", "Medical equipment", "Computers and appliances", "Storage and commercial space"];
export const RENTAL_RATE_UNITS = ["Fixed quote", "Hourly", "Daily", "Weekly", "30-day period"];
export function rentalLineAmount(values: Record<string, unknown>, assetId: string, field: "deposit" | "fixed" | "rate", fallback: number): number {
  const value = values[`line:${assetId}:${field}`];
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Enter a valid per-item amount.");
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 2147483647) throw new Error("Enter a valid non-negative per-item amount.");
  return amount;
}
export type RentalTerms = { category: string; rateUnit: string; ratePaise: number; pickupInstructions: string; returnInstructions: string; cancellationTerms: string; quantity?: number };
export const rentalTermsFields: FormFieldDef[] = [
  {key:"quantity",label:"Quantity for this booking line",type:"number",help:"Defaults to 1. Requires enough units in the catalog asset pool. Partial pickups and returns are recorded on the booking detail. Fixed quote and deposit are totals for the line; calculated rates are per unit."},
  {key:"rentalCategory",label:"Rental category",type:"select",options:RENTAL_CATEGORIES},
  {key:"rateUnit",label:"Pricing basis",type:"select",options:RENTAL_RATE_UNITS},
  {key:"rateRupees",label:"Rate per unit per period (for calculated pricing)",type:"currency"},
  {key:"pickupInstructions",label:"Pickup / delivery instructions",type:"textarea"},
  {key:"returnInstructions",label:"Return / collection instructions",type:"textarea"},
  {key:"cancellationTerms",label:"Agreed cancellation terms",type:"textarea"},
];
export function readRentalTerms(values: Record<string, unknown>): RentalTerms {
  const quantity = values.quantity === undefined || values.quantity === null || values.quantity === "" ? 1 : Number(values.quantity);
  if(!Number.isInteger(quantity)||quantity<1||quantity>10000)throw new Error("Quantity must be a whole number from 1 to 10,000.");
  const category=String(values.rentalCategory||RENTAL_CATEGORIES[0]);
  const rateUnit=String(values.rateUnit||RENTAL_RATE_UNITS[0]);
  const ratePaise=Math.round(Number(values.rateRupees||0)*100);
  if(!RENTAL_CATEGORIES.includes(category)||!RENTAL_RATE_UNITS.includes(rateUnit)) throw new Error("Select a valid rental category and pricing basis.");
  if(!Number.isSafeInteger(ratePaise)||ratePaise<0||ratePaise>2147483647) throw new Error("Enter a valid rental rate.");
  const text=(key:string)=>{const value=String(values[key]??'').trim();if(value.length>4000)throw new Error("Rental instructions must be 4000 characters or fewer.");return value;};
  return {category,rateUnit,ratePaise,quantity,pickupInstructions:text('pickupInstructions'),returnInstructions:text('returnInstructions'),cancellationTerms:text('cancellationTerms')};
}
/** Elapsed periods, rounded up. A 30-day period is explicitly not a calendar-month lease. */
export function rentalQuote(terms: RentalTerms, start: Date, end: Date, fixedPaise: number): number {
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw new Error("End must be after the booking start.");
  const hours: Record<string,number>={Hourly:1,Daily:24,Weekly:168,"30-day period":720};
  if(!RENTAL_RATE_UNITS.includes(terms.rateUnit))throw new Error("Invalid rental pricing basis.");
  const quantity = terms.quantity ?? 1;
  if(!Number.isInteger(quantity)||quantity<1||quantity>10000)throw new Error("Quantity must be a whole number from 1 to 10,000.");
  const amount=terms.rateUnit==='Fixed quote'?fixedPaise:Math.ceil((end.getTime()-start.getTime())/(hours[terms.rateUnit]*3600000))*terms.ratePaise*quantity;
  if(!Number.isSafeInteger(amount)||amount<0||amount>2147483647)throw new Error("Rental total exceeds the supported amount.");
  if(terms.rateUnit!=='Fixed quote'&&terms.ratePaise<=0)throw new Error("A positive rate is required for calculated pricing.");
  return amount;
}
