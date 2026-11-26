import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { withRecordLock } from "@/lib/withRecordLock";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { assertModuleAccess, assertPartnerCanWrite } from "@/lib/tenant";
import { hotelNights, hotelToday, hotelBalance, hotelPayerBalances, hotelPaymentMethods, hotelMoney, parseHotelRoom, type HotelRoom, type HotelStay, type FolioEntry } from "@/lib/hotelRules";
import { createBusinessRecord } from "@/lib/businessRecords";
import { getPartner } from "@/lib/partnerData";
import { INDIAN_STATES } from "@/lib/sample-data/geo";

const roomModule = "hotel-rooms", stayModule = "hotel-stays";
type HotelRoomTask = { roomId:string; roomName:string; kind:"Housekeeping"|"Maintenance"; assignee:string; instructions:string; dueDate:string; status:"Open"|"Completed"; createdAt:string; completedAt?:string; completionNotes?:string };
export async function listHotelRoomTasks(partnerId:string,roomId:string) {
  await authorize(partnerId);await roomRecord(partnerId,roomId);
  const rows=await prisma.businessRecord.findMany({where:{partnerId,moduleSlug:"hotel-room-tasks",data:{path:["roomId"],equals:roomId}},orderBy:{createdAt:"desc"},take:100});
  return rows.map(row=>({id:row.recordKey,...row.data as unknown as HotelRoomTask}));
}
export async function createHotelRoomTask(partnerId:string,roomId:string,values:Record<string,unknown>) {
  await authorize(partnerId,true);
  const kind=String(values.taskKind) as HotelRoomTask["kind"],assignee=String(values.taskAssignee??"").trim(),instructions=String(values.taskInstructions??"").trim(),dueDate=String(values.taskDueDate??"");
  if(!["Housekeeping","Maintenance"].includes(kind)||!assignee||assignee.length>200||!instructions||instructions.length>2000) throw new Error("Enter task type, assignee and instructions within supported limits.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)||!Number.isFinite(Date.parse(dueDate))||new Date(dueDate).toISOString().slice(0,10)!==dueDate||dueDate<hotelToday()) throw new Error("Choose a valid due date today or later.");
  return withRecordLock("hotel",partnerId,async()=>{
    const room=await roomRecord(partnerId,roomId);
    if(await roomInUse(partnerId,roomId))throw new Error("Move or check out the guest before blocking this room for work.");
    const open=await prisma.businessRecord.count({where:{partnerId,moduleSlug:"hotel-room-tasks",AND:[{data:{path:["roomId"],equals:roomId}},{data:{path:["status"],equals:"Open"}}]}});
    if(open>=20)throw new Error("Complete existing room tasks before adding more.");
    await saveHotelRoom(partnerId,roomId,{...room,rateRupees:room.ratePaise/100,status:kind==="Maintenance"||room.status==="Out of service"?"Out of service":"Dirty"});
    const recordKey=randomUUID(),data:HotelRoomTask={roomId,roomName:room.name,kind,assignee,instructions,dueDate,status:"Open",createdAt:new Date().toISOString()};
    await prisma.businessRecord.create({data:{partnerId,moduleSlug:"hotel-room-tasks",recordKey,data:JSON.parse(JSON.stringify(data))}});
    return recordKey;
  });
}
export async function completeHotelRoomTask(partnerId:string,taskId:string,values:Record<string,unknown>) {
  await authorize(partnerId,true);
  const completionNotes=String(values.taskCompletionNotes??"").trim();
  if(!completionNotes||completionNotes.length>2000)throw new Error("Enter completion notes up to 2000 characters.");
  return withRecordLock("hotel",partnerId,async()=>{
    const row=await prisma.businessRecord.findUnique({where:whereRecord(partnerId,"hotel-room-tasks",taskId)});
    if(!row)throw new Error("Room task not found.");
    const task=row.data as unknown as HotelRoomTask;
    if(task.status==="Completed") {if(task.completionNotes===completionNotes)return;throw new Error("Completed task history cannot be changed.");}
    await prisma.businessRecord.update({where:whereRecord(partnerId,"hotel-room-tasks",taskId),data:{data:{...task,status:"Completed",completedAt:new Date().toISOString(),completionNotes}}});
  });
}
async function authorize(partnerId: string, write = false) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "hotel");
  if (write) await assertPartnerCanWrite(partnerId);
}

async function createHotelStayInvoices(partnerId: string, stay: HotelStay & { id: string }, invoiceType: "GST" | "Non-GST"): Promise<{ payer: string; id: string; number: string }[]> {
  const partner = await getPartner(partnerId);
  if (!partner) throw new Error("The hotel business profile could not be loaded.");
  const gstRegistered = Boolean(partner.gstin?.trim());
  const issueGst = invoiceType === "GST";
  if (issueGst && !gstRegistered) throw new Error("A GST invoice can only be issued by a business with its own GSTIN.");
  if (issueGst && !partner.state?.trim()) throw new Error("Set the hotel's registered state before issuing a GST invoice.");
  if (stay.split?.gstin && (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(stay.split.gstin) || !stay.split.address?.trim())) throw new Error("Enter a valid address and GSTIN for the second folio payer.");
  const payers = stay.split
    ? [{ name: "Guest", customer: stay.guest, address: stay.guestAddress ?? "", city: stay.guestCity ?? "", state: stay.guestState ?? "", pincode: stay.guestPincode ?? "", gstin: stay.guestGstin ?? "", roomPaise: stay.roomChargePaise - stay.split.roomChargePaise }, { name: stay.split.name, customer: stay.split.name, address: stay.split.address ?? "", city: stay.split.city ?? "", state: stay.split.state ?? "", pincode: stay.split.pincode ?? "", gstin: stay.split.gstin ?? "", roomPaise: stay.split.roomChargePaise }]
    : [{ name: "Guest", customer: stay.guest, address: stay.guestAddress ?? "", city: stay.guestCity ?? "", state: stay.guestState ?? "", pincode: stay.guestPincode ?? "", gstin: stay.guestGstin ?? "", roomPaise: stay.roomChargePaise }];
  const invoices: { payer: string; id: string; number: string }[] = [];
  for (const payer of payers) {
    const payerEntries = stay.entries.filter(item => (item.payer ?? "Guest") === payer.name);
    const items: { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number; priceMode: "excl"; hsnCode: string }[] = [];
    let subtotalPaise = 0, taxPaise = 0;
    const addTaxInclusiveLine = (description: string, grossPaise: number, taxRateValue: unknown, sacValue: unknown) => {
      if (issueGst && (taxRateValue === undefined || taxRateValue === null || taxRateValue === "")) throw new Error("Set the applicable room and service tax rate before issuing this GST invoice.");
      const taxRate = Number(taxRateValue ?? 0), sac = String(sacValue ?? "").trim();
      if (!Number.isInteger(taxRate) || taxRate < 0 || taxRate > 100) throw new Error("A room or folio charge has an invalid tax rate. Correct it before checkout.");
      if (issueGst && !/^\d{4,6}$/.test(sac)) throw new Error("Set a valid accommodation or service SAC before issuing this GST invoice.");
      if (!gstRegistered && taxRate !== 0) throw new Error("This business has no GST registration. Set the room and folio charge tax rates to 0 before checkout.");
      const lineTaxPaise = issueGst ? Math.round(grossPaise * taxRate / (100 + taxRate)) : 0;
      const taxablePaise = grossPaise - lineTaxPaise;
      subtotalPaise += taxablePaise;
      taxPaise += lineTaxPaise;
      items.push({ description, quantity: 1, unit: "stay", unitPrice: taxablePaise / 100, taxRate: issueGst ? taxRate : 0, priceMode: "excl", hsnCode: issueGst ? sac : "" });
    };
    if (payer.roomPaise > 0) addTaxInclusiveLine(`Accommodation - ${stay.roomName}, ${stay.arrival} to ${stay.departure}`, payer.roomPaise, stay.taxRatePercent, stay.sac);
    for (const entry of payerEntries.filter(item => item.kind === "Charge")) addTaxInclusiveLine(entry.label, entry.amountPaise, entry.taxRatePercent ?? stay.taxRatePercent, entry.sac ?? stay.sac);
    const totalPaise = subtotalPaise + taxPaise;
    const payerBalance = hotelPayerBalances(stay).find(item => item.name === payer.name);
    if (!payerBalance || payerBalance.balance !== 0 || totalPaise !== payerBalance.charges) throw new Error(`Folio charges for ${payer.name} do not reconcile to their settled balance.`);
    if (totalPaise <= 0) continue;
    const methods = [...new Set(payerEntries.filter(item => item.kind === "Payment").map(item => item.paymentMethod).filter(Boolean))];
    const invoice = await createBusinessRecord(partnerId, "billing", {
      customer: payer.customer, customerAddress: payer.address, customerCity: payer.city, customerState: payer.state, customerPincode: payer.pincode, customerGstin: payer.gstin,
      placeOfSupplyState: stay.propertyState ?? partner.state ?? "", invoiceType,
      issueDate: hotelToday(), dueDate: hotelToday(), lineItemsSummary: items.map(item => item.description).join("; "), items,
      subtotal: subtotalPaise / 100, taxAmount: taxPaise / 100, totalAmount: totalPaise / 100,
      paymentStatus: "Paid", amountPaid: totalPaise / 100, amountDue: 0,
      paymentMode: methods.length === 1 ? methods[0] : methods.length > 1 ? "Mixed" : "Not recorded",
      paymentReferences: payerEntries.filter(item => item.kind === "Payment").map(item => item.reference).join(", "),
      sourceHotelStayId: stay.id, sourceHotelRoomId: stay.roomId, sourceHotelPayer: payer.name,
    });
    invoices.push({ payer: payer.name, id: String(invoice.id), number: String(invoice.invoiceNumber ?? invoice.id) });
  }
  return invoices;
}

const whereRecord = (partnerId: string, moduleSlug: string, recordKey: string) => ({ partnerId_moduleSlug_recordKey: { partnerId, moduleSlug, recordKey } });
async function roomRecord(partnerId: string, id: string) {
  const row = await prisma.businessRecord.findUnique({ where: whereRecord(partnerId, roomModule, id) });
  if (!row) throw new Error("Room not found.");
  return { id: row.recordKey, ...row.data as unknown as HotelRoom };
}
async function stayRecord(partnerId: string, id: string) {
  const row = await prisma.businessRecord.findUnique({ where: whereRecord(partnerId, stayModule, id) });
  if (!row) throw new Error("Reservation not found.");
  return { id: row.recordKey, ...row.data as unknown as HotelStay };
}
async function saveStay(partnerId: string, id: string, data: HotelStay) {
  await prisma.businessRecord.update({ where: whereRecord(partnerId, stayModule, id), data: { data: JSON.parse(JSON.stringify(data)) } });
}
async function roomInUse(partnerId: string, roomId: string) {
  return prisma.businessRecord.findFirst({ where: { partnerId, moduleSlug: stayModule, AND: [
    { data: { path: ["roomId"], equals: roomId } }, { data: { path: ["status"], equals: "Checked in" } },
  ] }, select: { recordKey: true } });
}
async function assertAvailable(partnerId: string, roomId: string, arrival: string, departure: string, exclude?: string) {
  const conflict = await prisma.businessRecord.findFirst({ where: { partnerId, moduleSlug: stayModule, ...(exclude ? { recordKey: { not: exclude } } : {}), AND: [
    { data: { path: ["roomId"], equals: roomId } },
    { OR: [{ data: { path: ["status"], equals: "Confirmed" } }, { data: { path: ["status"], equals: "Checked in" } }] },
    { data: { path: ["arrival"], lt: departure } },
    { OR: [{ data: { path: ["departure"], gt: arrival } }, { AND: [{ data: { path: ["status"], equals: "Checked in" } }, { data: { path: ["departure"], lte: hotelToday() } }] }] },
  ] }, select: { recordKey: true } });
  if (conflict) throw new Error("This room is already reserved or has a guest who has not checked out.");
}

export async function listHotelRooms(partnerId: string) {
  await authorize(partnerId);
  const rows = await prisma.businessRecord.findMany({ where: { partnerId, moduleSlug: roomModule }, orderBy: { recordKey: "asc" }, take: 501 });
  if (rows.length > 500) throw new Error("This workspace supports up to 500 rooms. Contact support before expanding.");
  return rows.map(row=>({id:row.recordKey,...row.data as unknown as HotelRoom}));
}
export async function listHotelStays(partnerId: string, page = 1) {
  await authorize(partnerId);
  const safePage = Number.isSafeInteger(page) && page > 0 && page < 10000 ? page : 1;
  const rows = await prisma.businessRecord.findMany({ where: { partnerId, moduleSlug: stayModule }, orderBy: [{ createdAt: "desc" }, { recordKey: "desc" }], take: 51, skip: (safePage - 1) * 50 });
  return { page: safePage, hasNext: rows.length > 50, stays: rows.slice(0,50).map(row=>({id:row.recordKey,...row.data as unknown as HotelStay})) };
}
export async function getHotelStay(partnerId: string, id: string) { await authorize(partnerId); return stayRecord(partnerId, id); }
export async function getHotelGroup(partnerId: string, stayId: string) {
  await authorize(partnerId);
  const stay = await stayRecord(partnerId, stayId);
  if (!stay.groupId) return [];
  const rows = await prisma.businessRecord.findMany({ where: { partnerId, moduleSlug: stayModule, data: { path: ["groupId"], equals: stay.groupId } }, orderBy: { recordKey: "asc" }, take: 21 });
  if (rows.length > 20) throw new Error("Group room limit exceeded. Contact support.");
  return rows.map(row => ({ id: row.recordKey, ...row.data as unknown as HotelStay }));
}

/** Every room is committed together. Each room retains its own payment and lifecycle history. */
export async function reserveHotelGroup(partnerId: string, values: Record<string, unknown>) {
  await authorize(partnerId, true);
  const additional = values.additionalRoomIds;
  if (!Array.isArray(additional) || additional.some(id => typeof id !== "string")) throw new Error("Select valid additional rooms.");
  const ids = [String(values.roomId ?? ""), ...additional as string[]];
  if (ids.length < 2 || ids.length > 20 || new Set(ids).size !== ids.length) throw new Error("Select between 2 and 20 different rooms for a group.");
  if(String(values.agreedNightlyRate??"").trim())throw new Error("Group bookings use each room's configured rate. Create a separate reservation to apply a negotiated nightly rate.");
  return withRecordLock("hotel", partnerId, async () => {
    const groupId = randomUUID(), stayIds: string[] = [];
    for (const roomId of ids) {
      // Nested locks reuse the outer transaction, so a later room conflict rolls back the group.
      const id = await reserveHotelStay(partnerId, { ...values, roomId });
      const stay = await stayRecord(partnerId, id);
      await saveStay(partnerId, id, { ...stay, groupId });
      stayIds.push(id);
    }
    return stayIds[0];
  });
}
export async function saveHotelRoom(partnerId: string, id: string | null, values: Record<string, unknown>) {
  await authorize(partnerId, true);
  const data = parseHotelRoom(values);
  return withRecordLock("hotel", partnerId, async()=>{
    const existing = id ? await roomRecord(partnerId, id) : null;
    if(existing && data.status!=="Out of service" && await prisma.businessRecord.findFirst({where:{partnerId,moduleSlug:"hotel-room-tasks",AND:[{data:{path:["roomId"],equals:id!}},{data:{path:["status"],equals:"Open"}},{data:{path:["kind"],equals:"Maintenance"}}]},select:{recordKey:true}})) throw new Error("Complete open maintenance before making this room available.");
    if(existing && data.status==="Ready" && await prisma.businessRecord.findFirst({where:{partnerId,moduleSlug:"hotel-room-tasks",AND:[{data:{path:["roomId"],equals:id!}},{data:{path:["status"],equals:"Open"}}]},select:{recordKey:true}})) throw new Error("Complete open room work before marking the room Ready.");
    const duplicate = await prisma.businessRecord.findFirst({ where: { partnerId, moduleSlug: roomModule, ...(id ? { recordKey: { not: id } } : {}), data: { path: ["nameKey"], equals: data.name.toLocaleLowerCase("en-IN") } }, select: { recordKey: true } });
    if (duplicate) throw new Error("A room with this name already exists.");
    if (existing && await roomInUse(partnerId, existing.id)) throw new Error("Check the guest out before changing this occupied room.");
    if (existing) {
      const incompatible = await prisma.businessRecord.findFirst({where:{partnerId,moduleSlug:stayModule,AND:[
        {data:{path:["roomId"],equals:existing.id}},{data:{path:["status"],equals:"Confirmed"}},{data:{path:["departure"],gt:hotelToday()}},
        ...(data.status==="Out of service"?[]:[{data:{path:["guests"],gt:data.capacity}}]),
      ]},select:{recordKey:true}});
      if (incompatible) throw new Error("Existing reservations need this room and capacity. Resolve them before this change.");
    }
    if (!id && await prisma.businessRecord.count({where:{partnerId,moduleSlug:roomModule}}) >= 500) throw new Error("Room limit reached.");
    const recordKey = id ?? randomUUID();
    if (!id && (data.taxRatePercent === undefined || !data.propertyState)) throw new Error("Set the room's tax rate and hotel property state before adding it to the hotel inventory.");
    const effectiveTaxRate = data.taxRatePercent ?? existing?.taxRatePercent;
    const stored = { ...data, ...(effectiveTaxRate !== undefined ? { taxRatePercent: effectiveTaxRate } : {}), ...(data.propertyState||existing?.propertyState?{propertyState:data.propertyState||existing?.propertyState}:{}), sac: data.sac || existing?.sac || "", nameKey: data.name.toLocaleLowerCase("en-IN") };
    await prisma.businessRecord.upsert({ where: whereRecord(partnerId, roomModule, recordKey), create: {partnerId,moduleSlug:roomModule,recordKey,data:stored},update:{data:stored} });
    return recordKey;
  });
}
export async function reserveHotelStay(partnerId: string, values: Record<string, unknown>) {
  await authorize(partnerId, true);
  const offlineDraftId=String(values.offlineDraftId??"").trim();
  if(offlineDraftId&&!/^[0-9a-f-]{36}$/i.test(offlineDraftId))throw new Error("Invalid offline reservation draft identifier.");
  return withRecordLock("hotel", partnerId, async()=>{
    if(offlineDraftId){
      const existing=await prisma.businessRecord.findUnique({where:whereRecord(partnerId,stayModule,offlineDraftId)});
      if(existing){
        const prior=existing.data as unknown as HotelStay;
        const requestedRate=String(values.agreedNightlyRate??"").trim()?hotelMoney(values.agreedNightlyRate):prior.ratePaise;
        const same=prior.roomId===String(values.roomId??"")&&prior.guest===String(values.guest??"").trim()&&prior.contact===String(values.contact??"").trim()&&prior.guests===Number(values.guests)&&prior.arrival===String(values.arrival??"")&&prior.departure===String(values.departure??"")&&prior.ratePaise===requestedRate;
        if(same&&prior.status!=="Cancelled")return offlineDraftId;
        throw new Error("This offline draft identifier was already used for a different or cancelled reservation.");
      }
    }
    const room = await roomRecord(partnerId, String(values.roomId ?? ""));
    const arrival=String(values.arrival??""),departure=String(values.departure??"");
    const nights=hotelNights(arrival,departure);
    if (arrival < hotelToday()) throw new Error("New reservations cannot start in the past.");
    if (room.status === "Out of service") throw new Error("This room is out of service.");
    if (room.taxRatePercent === undefined) throw new Error("Set a tax rate for this room before taking reservations. Enter 0 when no tax applies.");
    if (!room.propertyState) throw new Error("Set the hotel's property state before taking reservations.");
    const partner = await getPartner(partnerId);
    if (partner?.gstin && !/^\d{4,6}$/.test(String(room.sac ?? ""))) throw new Error("Set the accommodation SAC before taking reservations for a GST-registered hotel.");
    if (!partner?.gstin && room.taxRatePercent !== 0) throw new Error("A hotel without GST registration must set the room tax rate to 0.");
    const guests=Number(values.guests),guest=String(values.guest??"").trim(),contact=String(values.contact??"").trim();
    if (!guest || guest.length > 200 || !contact || contact.length > 100 || !Number.isInteger(guests) || guests < 1 || guests > room.capacity) throw new Error("Enter a guest name, contact and guest count within this room's capacity.");
    const agreedRateText=String(values.agreedNightlyRate??"").trim();
    const nightlyRatePaise=agreedRateText?hotelMoney(agreedRateText):room.ratePaise;
    if(offlineDraftId&&nightlyRatePaise!==room.ratePaise)throw new Error("This room's rate changed after the offline cache was saved. Refresh the room list and create a new request.");
    if(nightlyRatePaise<=0)throw new Error("The agreed nightly rate must be greater than zero.");
    const total=nights*nightlyRatePaise;
    if (!Number.isSafeInteger(total) || total>2147483647) throw new Error("Reservation amount exceeds the supported limit.");
    const guestAddress=String(values.guestAddress??"").trim(),guestCity=String(values.guestCity??"").trim(),guestState=String(values.guestState??"").trim(),guestPincode=String(values.guestPincode??"").trim(),guestGstin=String(values.guestGstin??"").trim().toUpperCase();
    if(guestAddress.length>1000 || guestCity.length>100 || guestPincode.length>10 || (guestState&&!INDIAN_STATES.includes(guestState as typeof INDIAN_STATES[number])) || (guestGstin && (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(guestGstin)||!guestAddress))) throw new Error("Enter a valid guest address and GSTIN. A billing address is required when the guest provides a GSTIN.");
    const data: HotelStay={roomId:room.id,roomName:room.name,guest,contact,guestAddress,guestCity,guestState,guestPincode,guestGstin,guests,arrival,departure,ratePaise:nightlyRatePaise,taxRatePercent:room.taxRatePercent,sac:room.sac,propertyState:room.propertyState,roomChargePaise:total,status:"Confirmed",entries:[]};
    const id=offlineDraftId||randomUUID();
    await assertAvailable(partnerId,room.id,arrival,departure);
    await prisma.businessRecord.create({data:{partnerId,moduleSlug:stayModule,recordKey:id,data:JSON.parse(JSON.stringify(data))}});
    return id;
  });
}
export async function transitionHotelStay(partnerId: string, id: string, action: string, requestedInvoiceType?: string) {
  await authorize(partnerId,true);
  return withRecordLock("hotel",partnerId,async()=>{
    const stay=await stayRecord(partnerId,id),room=await roomRecord(partnerId,stay.roomId);
    if (action === "check-in") {
      if (stay.status !== "Confirmed") throw new Error("Only confirmed reservations can check in.");
      if (hotelToday()<stay.arrival || hotelToday()>=stay.departure) throw new Error("Check-in is available only during the reserved stay dates.");
      if (room.status !== "Ready") throw new Error("Mark this room Ready after housekeeping before checking in.");
      await assertAvailable(partnerId,stay.roomId,stay.arrival,stay.departure,id);
      stay.status="Checked in";stay.checkedInAt=new Date().toISOString();
    } else if (action === "check-out") {
      if (stay.status !== "Checked in") throw new Error("Only checked-in stays can check out.");
      if (hotelPayerBalances(stay).some(payer=>payer.balance !== 0)) throw new Error("Settle every payer's folio balance before checkout.");
      if (!stay.invoiceId) {
        const partner=await getPartner(partnerId);
        if(requestedInvoiceType && !["GST","Non-GST"].includes(requestedInvoiceType))throw new Error("Select GST or Non-GST for the checkout invoice.");
        const invoiceType=requestedInvoiceType==="GST"||requestedInvoiceType==="Non-GST"?requestedInvoiceType:(partner?.gstin?"GST":"Non-GST");
        stay.taxRatePercent ??= room.taxRatePercent;
        stay.sac ||= room.sac;
        stay.invoiceType=invoiceType;
        stay.invoices = await createHotelStayInvoices(partnerId, stay, invoiceType);
        if(stay.invoices.length===0) throw new Error("No chargeable folio lines were available to invoice.");
        stay.invoiceId = stay.invoices[0].id;
        stay.invoiceNumber = stay.invoices[0].number;
      }
      stay.status="Checked out";stay.checkedOutAt=new Date().toISOString();
      const {id:roomId,...roomData}=room;
      await prisma.businessRecord.update({where:whereRecord(partnerId,roomModule,roomId),data:{data:{...roomData,status:"Dirty"}}});
    } else if (action === "cancel") {
      if (stay.status !== "Confirmed") throw new Error("Only confirmed reservations can be cancelled.");
      if (hotelBalance(stay).paid !== 0) throw new Error("Record the actual deposit refund before cancelling.");
      stay.status="Cancelled";stay.roomChargePaise=0;
      if (stay.split) stay.split.roomChargePaise=0;
      if (stay.entries.some(e=>e.kind==="Charge")) throw new Error("Resolve extra charges before cancelling; do not discard financial records.");
    } else throw new Error("Invalid reservation action.");
    await saveStay(partnerId,id,stay);
  });
}
export async function splitHotelFolio(partnerId: string, id: string, values: Record<string, unknown>) {
  await authorize(partnerId,true);
  const name=String(values.payerName??"").trim(),roomChargePaise=hotelMoney(values.payerAmount);
  if (!name || name.length>100 || name.toLowerCase()==="guest" || roomChargePaise<=0) throw new Error("Enter a separate payer name and positive room charge allocation.");
  return withRecordLock("hotel",partnerId,async()=>{
    const stay=await stayRecord(partnerId,id);
    if (!["Confirmed","Checked in"].includes(stay.status)) throw new Error("This folio is closed.");
    if (stay.entries.length) throw new Error("Set the split before recording any financial entries.");
    if (roomChargePaise>stay.roomChargePaise) throw new Error("Allocation cannot exceed room charges.");
    const address=String(values.payerAddress??"").trim(),city=String(values.payerCity??"").trim(),state=String(values.payerState??"").trim(),pincode=String(values.payerPincode??"").trim(),gstin=String(values.payerGstin??"").trim().toUpperCase();
    if(address.length>1000 || city.length>100 || pincode.length>10 || (state&&!INDIAN_STATES.includes(state as typeof INDIAN_STATES[number])) || (gstin&&(!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)||!address)))throw new Error("Enter a valid billing address and GSTIN for the second payer.");
    stay.split={name,roomChargePaise,address,city,state,pincode,gstin};
    await saveStay(partnerId,id,stay);
  });
}
export async function postHotelFolio(partnerId: string,id: string,values:Record<string,unknown>) {
  await authorize(partnerId,true);
  const kind=String(values.kind) as FolioEntry["kind"],reference=String(values.reference??"").trim(),label=String(values.label??"").trim(),amountPaise=hotelMoney(values.amount);
  const paymentMethod=kind==="Charge" ? undefined : String(values.paymentMethod??"") as FolioEntry["paymentMethod"];
  const taxRatePercent=values.taxRatePercent===undefined||values.taxRatePercent===""?undefined:Number(values.taxRatePercent),sac=String(values.sac??"").trim();
  if (!["Charge","Payment","Refund"].includes(kind) || !reference || reference.length>100 || !label || label.length>200 || amountPaise<=0) throw new Error("Enter a valid entry, positive amount, description and unique receipt/reference.");
  if(kind==="Charge"&&((taxRatePercent!==undefined&&(!Number.isInteger(taxRatePercent)||taxRatePercent<0||taxRatePercent>100))||sac.length>20))throw new Error("Enter a valid charge tax rate and SAC.");
  return withRecordLock("hotel",partnerId,async()=>{
    const stay=await stayRecord(partnerId,id);
    const payer=String(values.payer??"Guest");
    const payerBalance=hotelPayerBalances(stay).find(item=>item.name===payer);
    if (!payerBalance) throw new Error("Select a payer on this folio.");
    const repeated=stay.entries.find(entry=>entry.reference===reference);
    if (repeated) { if (repeated.kind===kind&&repeated.amountPaise===amountPaise&&repeated.label===label&&(repeated.payer??"Guest")===payer&&(repeated.paymentMethod??"")===(paymentMethod??"")) return false; throw new Error("That reference already records a different transaction."); }
    if (kind!=="Charge" && !hotelPaymentMethods.includes(paymentMethod as typeof hotelPaymentMethods[number])) throw new Error("Select a valid payment method for the receipt or refund.");
    if (!["Confirmed","Checked in"].includes(stay.status)) throw new Error("This folio is closed.");
    if (kind==="Charge" && stay.status!=="Checked in") throw new Error("Additional charges can be recorded after check-in.");
    let chargeRate=taxRatePercent,chargeSac=sac;
    if(kind==="Charge") {
      const partner=await getPartner(partnerId),registered=Boolean(partner?.gstin?.trim());
      chargeRate ??= stay.taxRatePercent;
      chargeSac ||= stay.sac ?? "";
      if(registered&&(chargeRate===undefined||!/^\d{4,6}$/.test(chargeSac)))throw new Error("Configure the GST tax rate and service SAC before recording this charge.");
      if(!registered&&chargeRate!==0)throw new Error("This hotel has no GST registration. Set the charge tax rate to 0.");
    }
    if (stay.entries.length>=1000) throw new Error("Folio entry limit reached. Contact support.");
    const balance=hotelBalance(stay);
    if (kind==="Refund"&&amountPaise>payerBalance.paid) throw new Error("Refund cannot exceed this payer's recorded net payments.");
    if (kind==="Payment"&&amountPaise>payerBalance.balance) throw new Error("Payment cannot exceed this payer's outstanding balance.");
    if (kind==="Charge"&&balance.charges+amountPaise>2147483647) throw new Error("Folio amount limit exceeded.");
    stay.entries.push({reference,kind,label,amountPaise,payer,...(paymentMethod?{paymentMethod}:{}),...(kind==="Charge"?{...(chargeRate!==undefined?{taxRatePercent:chargeRate}:{}),...(chargeSac?{sac:chargeSac}:{})}:{}),at:new Date().toISOString()});
    await saveStay(partnerId,id,stay);
    return true;
  });
}

export async function rescheduleHotelStay(partnerId:string,id:string,arrival:string,departure:string) {
  await authorize(partnerId,true);
  return withRecordLock("hotel",partnerId,async()=>{
    const stay=await stayRecord(partnerId,id);
    if (!["Confirmed","Checked in"].includes(stay.status)) throw new Error("Closed reservations cannot be rescheduled.");
    if (stay.status==="Checked in" && (arrival!==stay.arrival || departure<stay.departure)) throw new Error("An in-house stay can only extend its departure date.");
    if (stay.status==="Confirmed" && arrival<hotelToday()) throw new Error("Arrival cannot be in the past.");
    const nights=hotelNights(arrival,departure);
    const room=await roomRecord(partnerId,stay.roomId);
    if (room.status==="Out of service") throw new Error("Room is out of service.");
    await assertAvailable(partnerId,stay.roomId,arrival,departure,id);
    const amount=nights*stay.ratePaise;
    if (!Number.isSafeInteger(amount)||amount>2147483647) throw new Error("Reservation amount exceeds the supported limit.");
    const updated={...stay,arrival,departure,roomChargePaise:amount};
    if (amount<(stay.split?.roomChargePaise??0) || hotelPayerBalances(updated).some(payer=>payer.balance<0)) throw new Error("The shortened stay cannot cover its payer allocation or payments. Resolve the allocation/payment before shortening.");
    await saveStay(partnerId,id,updated);
  });
}

export async function moveHotelRoom(partnerId:string,id:string,expectedRoomId:string,values:Record<string,unknown>) {
  await authorize(partnerId,true);
  const targetId=String(values.moveRoomId??""),reason=String(values.moveReason??"").trim();
  if(!reason || reason.length>1000) throw new Error("Enter a room move reason up to 1000 characters.");
  return withRecordLock("hotel",partnerId,async()=>{
    const stay=await stayRecord(partnerId,id);
    if(!["Confirmed","Checked in"].includes(stay.status)) throw new Error("Closed stays cannot change rooms.");
    if(stay.roomId!==expectedRoomId) throw new Error("The room changed since this form opened. Refresh before moving again.");
    if(targetId===stay.roomId) throw new Error("Select a different room.");
    const destination=await roomRecord(partnerId,targetId);
    if(destination.status==="Out of service" || (stay.status==="Checked in" && destination.status!=="Ready")) throw new Error("The destination room must be available and Ready for an in-house move.");
    if(destination.capacity<stay.guests) throw new Error("The destination room cannot hold this guest count.");
    if((stay.roomMoves?.length??0)>=100) throw new Error("Room move history limit reached. Contact support.");
    await assertAvailable(partnerId,targetId,stay.arrival,stay.departure,id);
    const original=await roomRecord(partnerId,stay.roomId);
    if(stay.status==="Checked in") {
      const {id:oldId,...roomData}=original;
      await prisma.businessRecord.update({where:whereRecord(partnerId,roomModule,oldId),data:{data:{...roomData,status:"Dirty"}}});
    }
    // Preserve the agreed rate, split allocation and every financial entry.
    stay.roomMoves=[...(stay.roomMoves??[]),{fromRoomId:original.id,fromRoomName:original.name,toRoomId:destination.id,toRoomName:destination.name,at:new Date().toISOString(),reason}];
    stay.roomId=destination.id;stay.roomName=destination.name;
    await saveStay(partnerId,id,stay);
  });
}
