import { AppShell } from "@/components/AppShell";
import { LinkedRecordTable } from "@/components/LinkedRecordTable";
import { RecordForm } from "@/components/RecordForm";
import { listHotelRooms, listHotelRoomTasks } from "@/lib/hotel";
import { DataTable } from "@/components/DataTable";
import { hotelRoomFields } from "@/lib/hotelRules";
import { saveHotelRoomAction, hotelRoomTaskAction, hotelRoomTaskCompleteAction } from "../actions";
import { registerPage } from "@/lib/designer/registry";
registerPage({id:"hotel.rooms",moduleSlug:"hotel",title:"Hotel rooms and housekeeping",path:"/partner/[partnerId]/hotel/rooms",kind:"form",superAdminOnly:false,customizableRegions:[{key:"form-fields",label:"Room configuration"},{key:"table",label:"Room inventory"}],explanation:"Room names, types, capacity and nightly rates plus Ready/Dirty/Out of service housekeeping states. Occupied rooms cannot be edited.",sourceFile:"src/app/partner/[partnerId]/hotel/rooms/page.tsx"});
export const dynamic="force-dynamic";
export default async function HotelRooms({params,searchParams}:{params:{partnerId:string};searchParams?:{room?:string}}) {
  const rooms=await listHotelRooms(params.partnerId),room=rooms.find(r=>r.id===searchParams?.room);
  const tasks=room?await listHotelRoomTasks(params.partnerId,room.id):[],openTasks=tasks.filter(task=>task.status==="Open");
  return <AppShell topbarTitle="Rooms and housekeeping">
    <LinkedRecordTable columns={[{key:"name",label:"Room",type:"text"},{key:"roomType",label:"Type",type:"text"},{key:"capacity",label:"Capacity",type:"text"},{key:"status",label:"Housekeeping",type:"text"},{key:"rate",label:"Nightly rate",type:"currency"}]}
      rows={rooms.map(r=>({...r,href:`/partner/${params.partnerId}/hotel/rooms?room=${r.id}`,rate:r.ratePaise/100}))}/>
    <h2 className="mb-4 mt-8 font-display text-xl font-bold text-text">{room?`Update ${room.name}`:"Add a room"}</h2>
    <RecordForm key={room?.id??"new"} fields={hotelRoomFields} initialValues={room?{...room,rateRupees:room.ratePaise/100}:{status:"Ready",capacity:2}} submitLabel={room?"Save room":"Add room"} action={saveHotelRoomAction.bind(null,params.partnerId,room?.id??null)} />
    {room&&<><h2 className="mb-4 mt-8 font-display text-xl font-bold text-text">Room work orders</h2><p className="mb-3 text-sm text-text-muted">Owner-managed assignments; assignee names do not grant staff login access. Housekeeping blocks check-in; maintenance blocks bookings. Complete all open tasks, then inspect and mark the room Ready. Showing the latest 100 tasks.</p>
      <DataTable columns={[{key:"kind",label:"Task",type:"text"},{key:"assignee",label:"Assigned to",type:"text"},{key:"dueDate",label:"Due",type:"text"},{key:"status",label:"Status",type:"text"},{key:"instructions",label:"Instructions",type:"text"},{key:"completionNotes",label:"Completion notes",type:"text"}]} rows={tasks}/>
      <RecordForm submitLabel="Assign room work" action={hotelRoomTaskAction.bind(null,params.partnerId,room.id)} fields={[{key:"taskKind",label:"Work type",type:"select",options:["Housekeeping","Maintenance"],required:true},{key:"taskAssignee",label:"Assigned person",type:"text",required:true},{key:"taskInstructions",label:"Work instructions",type:"textarea",required:true},{key:"taskDueDate",label:"Due date",type:"date",required:true}]}/>
      {openTasks.length>0&&<RecordForm submitLabel="Record completed work" action={hotelRoomTaskCompleteAction.bind(null,params.partnerId,room.id)} fields={[{key:"taskId",label:"Open room task",type:"select",options:openTasks.map(task=>task.id),optionLabels:Object.fromEntries(openTasks.map(task=>[task.id,`${task.kind} — ${task.assignee} — ${task.dueDate}`])),required:true},{key:"taskCompletionNotes",label:"Completed work / inspection notes",type:"textarea",required:true}]}/>}
    </>}
  </AppShell>;
}
