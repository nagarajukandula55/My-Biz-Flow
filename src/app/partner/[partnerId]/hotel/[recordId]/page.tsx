import { AppShell } from "@/components/AppShell";
import { RecordDetail } from "@/components/RecordDetail";
import { RecordForm } from "@/components/RecordForm";
import { DataTable } from "@/components/DataTable";
import { LinkedRecordTable } from "@/components/LinkedRecordTable";
import { getHotelStay, getHotelGroup, listHotelRooms } from "@/lib/hotel";
import { hotelBalance, hotelPayerBalances, hotelPaymentMethods } from "@/lib/hotelRules";
import { hotelLifecycleAction,hotelFolioAction,rescheduleHotelAction,splitHotelAction,moveHotelAction } from "../actions";
import { registerPage } from "@/lib/designer/registry";
registerPage({id:"hotel.detail",moduleSlug:"hotel",title:"Hotel stay and folio",path:"/partner/[partnerId]/hotel/[recordId]",kind:"detail",superAdminOnly:false,customizableRegions:[{key:"field-grid",label:"Guest stay details"},{key:"table",label:"Folio entries"}],explanation:"Manage linked group rooms and two-payer folios. Allocate room charges before the first financial entry; record payer-specific extras, external payments and refunds with duplicate-reference protection. Checkout requires every payer balance settled and marks the room dirty.",sourceFile:"src/app/partner/[partnerId]/hotel/[recordId]/page.tsx"});
export const dynamic="force-dynamic";
export default async function HotelStayPage({params}:{params:{partnerId:string;recordId:string}}) {
  const stay=await getHotelStay(params.partnerId,params.recordId),balance=hotelBalance(stay),open=["Confirmed","Checked in"].includes(stay.status);
  const moveRooms = open ? (await listHotelRooms(params.partnerId)).filter(room=>room.id!==stay.roomId && room.status!=="Out of service" && room.capacity>=stay.guests) : [];
  const group = stay.groupId ? await getHotelGroup(params.partnerId, stay.id) : [];
  return <AppShell topbarTitle={`${stay.guest} — ${stay.roomName}`}>
    <RecordDetail recordLabel={stay.guest} fields={[
      {label:"Guest",value:stay.guest,type:"text"},{label:"Contact",value:stay.contact,type:"text"},{label:"Room",value:stay.roomName,type:"text"},
      {label:"Arrival",value:stay.arrival,type:"text"},{label:"Departure",value:stay.departure,type:"text"},{label:"Status",value:stay.status,type:"text"},
      {label:"Room charges",value:stay.roomChargePaise/100,type:"currency"},{label:"Total charges",value:balance.charges/100,type:"currency"},{label:"Net payments",value:balance.paid/100,type:"currency"},{label:"Outstanding",value:balance.balance/100,type:"currency"},
    ]} />
    {group.length > 0 && <><h2 className="mb-3 mt-6 font-display text-lg font-bold text-text">Group rooms</h2>
      <p className="mb-3 text-sm text-text-muted">Each room has a separate folio. Record receipts against the room they pay for; cancelling or rescheduling this room does not change the other rooms.</p>
      <LinkedRecordTable columns={[{key:"roomName",label:"Room",type:"text"},{key:"status",label:"Status",type:"text"},{key:"arrival",label:"Arrival",type:"text"},{key:"departure",label:"Departure",type:"text"},{key:"balance",label:"Outstanding",type:"currency"}]} rows={group.map(item=>({...item,balance:hotelBalance(item).balance/100,href:`/partner/${params.partnerId}/hotel/${item.id}`}))} />
    </>}
    <h2 className="mb-3 mt-6 font-display text-lg font-bold text-text">Folio entries</h2>
    <DataTable columns={[{key:"reference",label:"Reference",type:"text"},{key:"payer",label:"Payer",type:"text"},{key:"kind",label:"Entry",type:"text"},{key:"paymentMethod",label:"Payment method",type:"text"},{key:"label",label:"Description",type:"text"},{key:"amount",label:"Amount",type:"currency"},{key:"at",label:"Recorded",type:"datetime"}]} rows={stay.entries.map(e=>({...e,id:e.reference,paymentMethod:e.kind==="Charge"?"Not applicable":e.paymentMethod??"Not recorded",payer:e.payer??"Guest",amount:e.amountPaise/100}))}/>
    {stay.split && <><h2 className="mb-3 mt-6 font-display text-lg font-bold text-text">Payer balances</h2><DataTable columns={[{key:"name",label:"Payer",type:"text"},{key:"charges",label:"Charges",type:"currency"},{key:"paid",label:"Net payments",type:"currency"},{key:"balance",label:"Outstanding",type:"currency"}]} rows={hotelPayerBalances(stay).map(payer=>({...payer,id:payer.name,charges:payer.charges/100,paid:payer.paid/100,balance:payer.balance/100}))}/></>}
    {open && stay.entries.length===0 && <><h2 className="mb-3 mt-6 font-display text-lg font-bold text-text">Split room charges between two payers</h2><p className="mb-3 text-sm text-text-muted">Allocate a fixed part of room charges to a company or second payer. The remainder belongs to Guest. Set this before recording receipts or charges; the split is locked after the first financial entry. Extensions add room charges to Guest. This records separate balances, not statutory invoices or automatic payments.</p><RecordForm submitLabel="Save payer allocation" action={splitHotelAction.bind(null,params.partnerId,stay.id)} initialValues={{payerName:stay.split?.name??"",payerAmount:stay.split?stay.split.roomChargePaise/100:""}} fields={[{key:"payerName",label:"Second payer name",type:"text",required:true},{key:"payerAmount",label:"Room charges allocated to second payer (₹)",type:"currency",required:true}]}/></>}
    {(stay.roomMoves?.length??0)>0 && <><h2 className="mb-3 mt-6 font-display text-lg font-bold text-text">Room move history</h2><DataTable columns={[{key:"fromRoomName",label:"From",type:"text"},{key:"toRoomName",label:"To",type:"text"},{key:"reason",label:"Reason",type:"text"},{key:"at",label:"Moved at",type:"datetime"}]} rows={stay.roomMoves!.map((move,index)=>({...move,id:String(index)}))}/></>}
    {open&&<><h2 className="mb-3 mt-6 font-display text-lg font-bold text-text">Record a charge or payment</h2><p className="mb-3 text-sm text-text-muted">Record only money actually collected/refunded outside this app. Use a unique receipt/reference; submitting it twice does not duplicate the entry. This folio is not a statutory tax invoice.</p>
      <RecordForm submitLabel="Record entry" initialValues={{payer:"Guest",paymentMethod:"Cash"}} action={hotelFolioAction.bind(null,params.partnerId,stay.id)} fields={[
        {key:"payer",label:"Payer",type:"select",options:hotelPayerBalances(stay).map(item=>item.name),required:true},
        {key:"kind",label:"Entry type",type:"select",options:stay.status==="Checked in"?["Charge","Payment","Refund"]:["Payment","Refund"],required:true},
        {key:"paymentMethod",label:"Payment method (receipts/refunds only; ignored for charges)",type:"select",options:[...hotelPaymentMethods]},
        {key:"reference",label:"Unique receipt / reference",type:"text",required:true},{key:"label",label:"Description",type:"text",required:true},{key:"amount",label:"Amount (₹)",type:"currency",required:true},
      ]}/>
      <h2 className="mb-3 mt-6 font-display text-lg font-bold text-text">Move room</h2><p className="mb-3 text-sm text-text-muted">The agreed nightly rate, room charges and payer allocations remain unchanged. The destination must be free for the full reserved dates. An in-house move marks the original room Dirty.</p><RecordForm submitLabel="Move to selected room" action={moveHotelAction.bind(null,params.partnerId,stay.id,stay.roomId)} fields={[{key:"moveRoomId",label:"Destination room",type:"select",options:moveRooms.map(room=>room.id),optionLabels:Object.fromEntries(moveRooms.map(room=>[room.id,room.name])),required:true},{key:"moveReason",label:"Room move reason",type:"textarea",required:true}]}/>
      <h2 className="mb-3 mt-6 font-display text-lg font-bold text-text">Manage stay</h2>
      <RecordForm submitLabel={stay.status==="Checked in"?"Extend stay":"Reschedule"} initialValues={{arrival:stay.arrival,departure:stay.departure}} action={rescheduleHotelAction.bind(null,params.partnerId,stay.id)} fields={[{key:"arrival",label:"Arrival date (unchanged for in-house guests)",type:"date",required:true},{key:"departure",label:"Departure date",type:"date",required:true}]}/>
      <RecordForm submitLabel="Update stay" action={hotelLifecycleAction.bind(null,params.partnerId,stay.id)} fields={[{key:"action",label:"Action",type:"select",options:stay.status==="Confirmed"?["check-in","cancel"]:["check-out"],optionLabels:{"check-in":"Check in","check-out":"Check out",cancel:"Cancel reservation"},required:true}]}/>
    </>}
  </AppShell>;
}
