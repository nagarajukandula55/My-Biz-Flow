import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { LinkedRecordTable } from "@/components/LinkedRecordTable";
import { listHotelStays } from "@/lib/hotel";
import { hotelBalance } from "@/lib/hotelRules";
import { registerPage } from "@/lib/designer/registry";
registerPage({id:"hotel.list",moduleSlug:"hotel",title:"Hotel reservations",path:"/partner/[partnerId]/hotel",kind:"list",superAdminOnly:false,customizableRegions:[{key:"table",label:"Reservation table"}],explanation:"Paginated guest reservations with room, dates, status and outstanding folio balance. Booking details provide check-in/out and payment recording.",sourceFile:"src/app/partner/[partnerId]/hotel/page.tsx"});
export const dynamic="force-dynamic";
export default async function HotelPage({params,searchParams}:{params:{partnerId:string};searchParams?:{page?:string}}) {
  const result=await listHotelStays(params.partnerId,Number(searchParams?.page??1));
  const root=`/partner/${params.partnerId}/hotel`;
  return <AppShell topbarTitle="Hotel reservations" topbarActions={<Link className="btn-accent min-h-11" href={`${root}/new`}>New reservation</Link>}>
    <p className="mb-4 text-sm text-text-muted">Owner-operated front desk. Payments entered here record money collected or refunded elsewhere; they do not charge a guest.</p>
    <Link href={`${root}/rooms`} className="mb-4 inline-flex min-h-11 items-center text-teal underline">Rooms and housekeeping</Link>
    <LinkedRecordTable columns={[{key:"guest",label:"Guest",type:"text"},{key:"roomName",label:"Room",type:"text"},{key:"arrival",label:"Arrival",type:"text"},{key:"departure",label:"Departure",type:"text"},{key:"status",label:"Status",type:"text"},{key:"balance",label:"Balance",type:"currency"}]}
      rows={result.stays.map(stay=>({id:stay.id,guest:stay.guest,roomName:stay.roomName,arrival:stay.arrival,departure:stay.departure,status:stay.status,href:`${root}/${stay.id}`,balance:hotelBalance(stay).balance/100}))} />
    <nav className="mt-4 flex flex-wrap gap-3" aria-label="Reservation pages">{result.page>1&&<Link className="btn-outline min-h-11" href={`${root}?page=${result.page-1}`}>Previous</Link>}{result.hasNext&&<Link className="btn-outline min-h-11" href={`${root}?page=${result.page+1}`}>Next</Link>}</nav>
  </AppShell>;
}
