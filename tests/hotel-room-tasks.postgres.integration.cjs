const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const load = require('./loadModule.cjs');
if (process.env.MBF_ISOLATED_TEST !== '1' || !['postgresql://ci:ci@127.0.0.1:55439/ci','postgres://ci:ci@localhost:5432/ci','postgresql://ci:ci@localhost:5432/ci'].includes(process.env.DATABASE_URL)) throw Error('Disposable localhost database required');
const { PrismaClient } = require('@prisma/client'), base = new PrismaClient();
const db = load('src/lib/databaseTransaction.ts', {'node:async_hooks':require('node:async_hooks'),'@/lib/databaseClientContext':load('src/lib/databaseClientContext.ts')});
const prisma = db.transactionAwareClient(base), lock = load('src/lib/withRecordLock.ts', {'@/lib/prisma':{prisma},'@/lib/databaseTransaction':db});
const rules = load('src/lib/hotelRules.ts'), partnerId = 'hotel-group-' + crypto.randomUUID();
let authorized = true;
const hotel = load('src/lib/hotel.ts', {'node:crypto':crypto,'@/lib/prisma':{prisma},'@/lib/withRecordLock':lock,'@/lib/hotelRules':rules,
  '@/lib/requirePartnerSession':{requireSessionPartnerId:async()=>{if (!authorized) throw Error('owner required');}},
  '@/lib/tenant':{assertModuleAccess:async()=>{},assertPartnerCanWrite:async()=>{}},
});
test('Room work is tenant-scoped, blocks availability and retains immutable completion',async()=>{
 const input={name:'Task room',roomType:'Standard',capacity:2,rateRupees:1000,status:'Ready'};
 const roomId=await hotel.saveHotelRoom(partnerId,null,input),values={taskKind:'Maintenance',taskAssignee:'Synthetic worker',taskInstructions:'Repair lock',taskDueDate:rules.hotelToday()};
 await assert.rejects(hotel.createHotelRoomTask(partnerId+'-foreign',roomId,values),/not found/);
 const task=await hotel.createHotelRoomTask(partnerId,roomId,values);
 assert.equal((await hotel.listHotelRooms(partnerId))[0].status,'Out of service');
 await assert.rejects(hotel.saveHotelRoom(partnerId,roomId,{...input,status:'Dirty'}),/maintenance/);
 await assert.rejects(hotel.completeHotelRoomTask(partnerId+'-foreign',task,{taskCompletionNotes:'Done'}),/not found/);
 await hotel.completeHotelRoomTask(partnerId,task,{taskCompletionNotes:'Lock repaired'});
 await hotel.completeHotelRoomTask(partnerId,task,{taskCompletionNotes:'Lock repaired'});
 await assert.rejects(hotel.completeHotelRoomTask(partnerId,task,{taskCompletionNotes:'Changed'}),/cannot be changed/);
 assert.equal((await hotel.listHotelRooms(partnerId))[0].status,'Out of service');
 await hotel.saveHotelRoom(partnerId,roomId,input);
 const clean=await hotel.createHotelRoomTask(partnerId,roomId,{...values,taskKind:'Housekeeping'});
 await assert.rejects(hotel.saveHotelRoom(partnerId,roomId,input),/open room work/);
 await hotel.completeHotelRoomTask(partnerId,clean,{taskCompletionNotes:'Cleaned and inspected'});
 await hotel.saveHotelRoom(partnerId,roomId,input);
 assert.equal((await hotel.listHotelRoomTasks(partnerId,roomId)).length,2);
 const arrival=rules.hotelToday(),departure=new Date(Date.parse(arrival)+86400000).toISOString().slice(0,10);
 await hotel.reserveHotelStay(partnerId,{roomId,arrival,departure,guest:'Guest',guests:1});
 await assert.rejects(hotel.createHotelRoomTask(partnerId,roomId,values),/Existing reservations/);
 assert.equal((await hotel.listHotelRoomTasks(partnerId,roomId)).length,2);
});
test.after(async()=>{await base.businessRecord.deleteMany({where:{partnerId}});await base.$disconnect();});
