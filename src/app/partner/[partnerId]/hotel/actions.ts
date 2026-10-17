"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { reserveHotelStay, reserveHotelGroup, saveHotelRoom, transitionHotelStay, postHotelFolio, rescheduleHotelStay, splitHotelFolio, moveHotelRoom, createHotelRoomTask, completeHotelRoomTask } from "@/lib/hotel";
const message=(error:unknown)=>({error:error instanceof Error?error.message:"Could not save. Please retry."});
export async function moveHotelAction(partnerId:string,id:string,expectedRoomId:string,values:Record<string,unknown>) {
  try { await moveHotelRoom(partnerId,id,expectedRoomId,values); } catch(error) { return message(error); }
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
  revalidatePath(`/partner/${partnerId}/hotel`,"layout");
  redirect(`/partner/${partnerId}/hotel/${id}`);
}
export async function reserveHotelAction(partnerId:string,values:Record<string,unknown>) {
  let id;
  try { id=Array.isArray(values.additionalRoomIds) && values.additionalRoomIds.length ? await reserveHotelGroup(partnerId,values) : await reserveHotelStay(partnerId,values); } catch(error) { return message(error); }
  revalidatePath(`/partner/${partnerId}/hotel`);
  redirect(`/partner/${partnerId}/hotel/${id}`);
}
export async function saveHotelRoomAction(partnerId:string,id:string|null,values:Record<string,unknown>) {
  try { await saveHotelRoom(partnerId,id,values); } catch(error) { return message(error); }
  revalidatePath(`/partner/${partnerId}/hotel/rooms`);
  redirect(`/partner/${partnerId}/hotel/rooms`);
}
export async function hotelLifecycleAction(partnerId:string,id:string,values:Record<string,unknown>) {
  try { await transitionHotelStay(partnerId,id,String(values.action)); } catch(error) { return message(error); }
  revalidatePath(`/partner/${partnerId}/hotel`,"layout");
  redirect(`/partner/${partnerId}/hotel/${id}`);
}
export async function hotelFolioAction(partnerId:string,id:string,values:Record<string,unknown>) {
  try { await postHotelFolio(partnerId,id,values); } catch(error) { return message(error); }
  revalidatePath(`/partner/${partnerId}/hotel/${id}`);
  redirect(`/partner/${partnerId}/hotel/${id}`);
}
export async function hotelRoomTaskAction(partnerId:string,roomId:string,values:Record<string,unknown>) {
  try { await createHotelRoomTask(partnerId,roomId,values); } catch(error) { return message(error); }
  revalidatePath(`/partner/${partnerId}/hotel`,"layout");
  redirect(`/partner/${partnerId}/hotel/rooms?room=${roomId}`);
}
export async function hotelRoomTaskCompleteAction(partnerId:string,roomId:string,values:Record<string,unknown>) {
  try { await completeHotelRoomTask(partnerId,String(values.taskId??""),values); } catch(error) { return message(error); }
  revalidatePath(`/partner/${partnerId}/hotel`,"layout");
  redirect(`/partner/${partnerId}/hotel/rooms?room=${roomId}`);
}
