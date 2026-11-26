import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/components/RecordForm";
import { listHotelRooms } from "@/lib/hotel";
import { reserveHotelAction } from "../actions";
import { registerPage } from "@/lib/designer/registry";
registerPage({id:"hotel.create",moduleSlug:"hotel",title:"New hotel reservation",path:"/partner/[partnerId]/hotel/new",kind:"form",superAdminOnly:false,customizableRegions:[{key:"form-fields",label:"Reservation fields"}],explanation:"Reserves one room or an atomic group of up to 20 rooms. Dates, capacity, availability and nightly rate snapshots are validated together; each group room retains an independent folio.",sourceFile:"src/app/partner/[partnerId]/hotel/new/page.tsx"});
export const dynamic="force-dynamic";
export default async function NewHotelStay({params}:{params:{partnerId:string}}) {
  const rooms=(await listHotelRooms(params.partnerId)).filter(room=>room.status!=="Out of service");
  return <AppShell topbarTitle="New hotel reservation"><p className="mb-4 text-sm text-text-muted">Arrival is inclusive; departure is exclusive. The current room rate is saved with this reservation. For a single-room booking, you may enter a negotiated nightly rate; leave it blank to use the room's current rate. Group bookings use each room's configured rate. All operational dates use IST.</p>
    <p className="mb-4 text-sm text-text-muted">For a group, select additional rooms. Guest count applies to each room; every room must have that capacity. All rooms are reserved together or none are. Each room has a separate folio and can be managed independently.</p>
    <RecordForm submitLabel="Reserve selected rooms" action={reserveHotelAction.bind(null,params.partnerId)} fields={[
      {key:"roomId",label:"Room",type:"select",options:rooms.map(r=>r.id),optionLabels:Object.fromEntries(rooms.map(r=>[r.id,`${r.name} — ${r.roomType} — ₹${r.ratePaise/100}/night — ${r.capacity} guests`])),required:true},
      {key:"additionalRoomIds",label:"Additional rooms for group (optional, do not repeat the first room)",type:"multi-select",options:rooms.map(r=>r.id),optionLabels:Object.fromEntries(rooms.map(r=>[r.id,`${r.name} — ${r.roomType} — ${r.capacity} guests`]))},
      {key:"agreedNightlyRate",label:"Agreed nightly rate for this room (optional override)",type:"currency"},
      {key:"guest",label:"Lead guest name",type:"text",required:true},{key:"contact",label:"Guest contact",type:"text",required:true},
      {key:"guestAddress",label:"Guest billing address",type:"textarea"},{key:"guestCity",label:"Guest city",type:"text",addressRole:"city"},{key:"guestState",label:"Guest state",type:"text",addressRole:"state"},{key:"guestPincode",label:"Guest pincode",type:"text",addressRole:"pincode"},{key:"guestGstin",label:"Guest GSTIN (if applicable)",type:"text"},
      {key:"guests",label:"Number of guests per room",type:"number",required:true},{key:"arrival",label:"Arrival date",type:"date",required:true},{key:"departure",label:"Departure date",type:"date",required:true},
    ]} />
  </AppShell>;
}
