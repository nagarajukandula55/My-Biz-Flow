"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { reserveHotelStay, reserveHotelGroup, saveHotelRoom, transitionHotelStay, postHotelFolio, rescheduleHotelStay, splitHotelFolio, moveHotelRoom, createHotelRoomTask, completeHotelRoomTask } from "@/lib/hotel";
import { sendPartnerTelegramAlert, type TelegramAlertType } from "@/lib/telegram";
import { prisma } from "@/lib/prisma";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
const message=(error:unknown)=>({error:error instanceof Error?error.message:"Could not save. Please retry."});
async function notifyHotel(partnerId:string,type:TelegramAlertType,text:string){try{await sendPartnerTelegramAlert(partnerId,type,text);}catch(error){console.error("[hotel-telegram] delivery failed",error);}}
export async function moveHotelAction(partnerId:string,id:string,expectedRoomId:string,values:Record<string,unknown>) {
  try { await moveHotelRoom(partnerId,id,expectedRoomId,values); } catch(error) { return message(error); }
  await notifyHotel(partnerId,"hotelReservationChanged",`Hotel reservation ${id} moved to another room. Reason: ${String(values.moveReason??"").trim()}.`);
  revalidatePath(`/partner/${partnerId}/hotel`,"layout");
  redirect(`/partner/${partnerId}/hotel/${id}`);
}
export async function splitHotelAction(partnerId:string,id:string,values:Record<string,unknown>) {
  try { await splitHotelFolio(partnerId,id,values); } catch(error) { return message(error); }
  revalidatePath(`/partner/${partnerId}/hotel/${id}`);
  redirect(`/partner/${partnerId}/hotel/${id}`);
}
export async function rescheduleHotelAction(partnerId:string,id:string,values:Record<string,unknown>) {
  try { await rescheduleHotelStay(partnerId,id,String(values.arrival??""),String(values.departure??"")); } catch(error) { return message(error); }
  await notifyHotel(partnerId,"hotelReservationChanged",`Hotel reservation ${id} dates changed to ${String(values.arrival)} through ${String(values.departure)}.`);
  revalidatePath(`/partner/${partnerId}/hotel`,"layout");
  redirect(`/partner/${partnerId}/hotel/${id}`);
}
export async function reserveHotelAction(partnerId:string,values:Record<string,unknown>) {
  let id;
  try { id=Array.isArray(values.additionalRoomIds) && values.additionalRoomIds.length ? await reserveHotelGroup(partnerId,values) : await reserveHotelStay(partnerId,values); } catch(error) { return message(error); }
  await notifyHotel(partnerId,"hotelReservationCreated",`Hotel reservation created for ${String(values.guest??"Guest")}, room ${String(values.roomId)}, ${String(values.arrival)} to ${String(values.departure)}. Reservation ID: ${id}.`);
  revalidatePath(`/partner/${partnerId}/hotel`);
  redirect(`/partner/${partnerId}/hotel/${id}`);
}
export async function syncOfflineHotelReservationAction(partnerId:string,draft:{id:string;payload:Record<string,unknown>}) {
  try {
    partnerId=await requireSessionPartnerId(partnerId);
    if(draft.payload?.partnerId!==partnerId)throw new Error("This draft belongs to a different business account.");
    if(!/^[0-9a-f-]{36}$/i.test(draft.id))throw new Error("Invalid offline draft identifier.");
    const existing=await prisma.businessRecord.findUnique({where:{partnerId_moduleSlug_recordKey:{partnerId,moduleSlug:"hotel-stays",recordKey:draft.id}},select:{id:true}});
    const stayId=await reserveHotelStay(partnerId,{...draft.payload,offlineDraftId:draft.id});
    if(!existing)await notifyHotel(partnerId,"hotelReservationCreated",`Offline hotel reservation request synced for ${String(draft.payload.guest??"Guest")}, room ${String(draft.payload.roomId??"")}. Reservation ID: ${stayId}.`);
    revalidatePath(`/partner/${partnerId}/hotel`);
    revalidatePath(`/partner/${partnerId}/hotel/${stayId}`);
    return {stayId};
  } catch(error) { throw error instanceof Error?error:new Error("Could not sync this hotel request."); }
}
export async function saveHotelRoomAction(partnerId:string,id:string|null,values:Record<string,unknown>) {
  try { await saveHotelRoom(partnerId,id,values); } catch(error) { return message(error); }
  revalidatePath(`/partner/${partnerId}/hotel/rooms`);
  redirect(`/partner/${partnerId}/hotel/rooms`);
}
export async function hotelLifecycleAction(partnerId:string,id:string,values:Record<string,unknown>) {
  try { await transitionHotelStay(partnerId,id,String(values.action),String(values.invoiceType??"")); } catch(error) { return message(error); }
  const action=String(values.action);
  if(action==="check-in") await notifyHotel(partnerId,"hotelGuestCheckedIn",`Guest checked in. Hotel reservation: ${id}.`);
  else if(action==="check-out") await notifyHotel(partnerId,"hotelGuestCheckedOut",`Guest checked out and folio invoiced. Hotel reservation: ${id}. Invoice type: ${String(values.invoiceType??"")}.`);
  else if(action==="cancel") await notifyHotel(partnerId,"hotelReservationCancelled",`Hotel reservation ${id} was cancelled.`);
  revalidatePath(`/partner/${partnerId}/hotel`,"layout");
  redirect(`/partner/${partnerId}/hotel/${id}`);
}
export async function hotelFolioAction(partnerId:string,id:string,values:Record<string,unknown>) {
  let recorded=false;
  try { recorded=await postHotelFolio(partnerId,id,values); } catch(error) { return message(error); }
  const kind=String(values.kind);
  if(recorded&&kind==="Charge") await notifyHotel(partnerId,"hotelFolioCharge",`Hotel folio charge recorded for reservation ${id}: ${String(values.label)} (${String(values.amount)}).`);
  else if(recorded) await notifyHotel(partnerId,"hotelFolioPayment",`Hotel folio ${kind.toLowerCase()} recorded for reservation ${id}: ${String(values.label)} (${String(values.amount)}).`);
  revalidatePath(`/partner/${partnerId}/hotel/${id}`);
  redirect(`/partner/${partnerId}/hotel/${id}`);
}
export async function hotelRoomTaskAction(partnerId:string,roomId:string,values:Record<string,unknown>) {
  try { await createHotelRoomTask(partnerId,roomId,values); } catch(error) { return message(error); }
  await notifyHotel(partnerId,"hotelHousekeepingTask",`Hotel ${String(values.taskKind??"room").toLowerCase()} task opened for room ${roomId}, assigned to ${String(values.taskAssignee??"staff")}.`);
  revalidatePath(`/partner/${partnerId}/hotel`,"layout");
  redirect(`/partner/${partnerId}/hotel/rooms?room=${roomId}`);
}
export async function hotelRoomTaskCompleteAction(partnerId:string,roomId:string,values:Record<string,unknown>) {
  try { await completeHotelRoomTask(partnerId,String(values.taskId??""),values); } catch(error) { return message(error); }
  await notifyHotel(partnerId,"hotelHousekeepingTask",`Hotel room task ${String(values.taskId??"")} for room ${roomId} was completed.`);
  revalidatePath(`/partner/${partnerId}/hotel`,"layout");
  redirect(`/partner/${partnerId}/hotel/rooms?room=${roomId}`);
}
