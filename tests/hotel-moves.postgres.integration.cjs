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
test('Room moves preserve financial history and serialize availability safely',async()=>{
 const create=(name,capacity=2,status='Ready')=>hotel.saveHotelRoom(partnerId,null,{name,capacity,status,roomType:'Standard',rateRupees:2500});
 const a=await create('Move A'),b=await create('Move B'),c=await create('Small',1),d=await create('Dirty',2,'Dirty');
 const arrival=rules.hotelToday(),departure=new Date(Date.parse(arrival)+86400000).toISOString().slice(0,10);
 const id=await hotel.reserveHotelStay(partnerId,{roomId:a,guest:'Move guest',guests:2,arrival,departure});
 await hotel.splitHotelFolio(partnerId,id,{payerName:'Company',payerAmount:500});
 await hotel.postHotelFolio(partnerId,id,{kind:'Payment',paymentMethod:'Cash',payer:'Company',reference:'move-deposit',label:'Deposit',amount:200});
 await assert.rejects(hotel.moveHotelRoom(partnerId+'-foreign',id,a,{moveRoomId:b,moveReason:'Upgrade'}),/not found/);
 await assert.rejects(hotel.moveHotelRoom(partnerId,id,a,{moveRoomId:c,moveReason:'Upgrade'}),/guest count/);
 await hotel.transitionHotelStay(partnerId,id,'check-in');
 await assert.rejects(hotel.moveHotelRoom(partnerId,id,a,{moveRoomId:d,moveReason:'Upgrade'}),/Ready/);
 const before=await hotel.getHotelStay(partnerId,id);
 const blocker=await hotel.reserveHotelStay(partnerId,{roomId:b,guest:'Other guest',guests:1,arrival,departure});
 await assert.rejects(hotel.moveHotelRoom(partnerId,id,a,{moveRoomId:b,moveReason:'Upgrade'}),/already reserved/);
 assert.equal((await hotel.getHotelStay(partnerId,id)).roomId,a);
 assert.equal((await hotel.listHotelRooms(partnerId)).find(room=>room.id===a).status,'Ready');
 await hotel.transitionHotelStay(partnerId,blocker,'cancel');
 const results=await Promise.allSettled([hotel.moveHotelRoom(partnerId,id,a,{moveRoomId:b,moveReason:'Upgrade'}),hotel.moveHotelRoom(partnerId,id,a,{moveRoomId:b,moveReason:'Upgrade'})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const after=await hotel.getHotelStay(partnerId,id);
 assert.equal(after.roomId,b);assert.equal(after.roomMoves.length,1);assert.equal(after.roomChargePaise,before.roomChargePaise);assert.equal(after.ratePaise,before.ratePaise);
 assert.equal(JSON.stringify(after.entries),JSON.stringify(before.entries));assert.equal(JSON.stringify(after.split),JSON.stringify(before.split));
 assert.equal((await hotel.listHotelRooms(partnerId)).find(room=>room.id===a).status,'Dirty');
});
test('Confirmed group room moves preserve group membership without dirtying unused room',async()=>{
 const create=name=>hotel.saveHotelRoom(partnerId,null,{name,capacity:2,status:'Ready',roomType:'Standard',rateRupees:1000});
 const a=await create('Group move A'),b=await create('Group move B'),c=await create('Group move C');
 const arrival=rules.hotelToday(),departure=new Date(Date.parse(arrival)+86400000).toISOString().slice(0,10);
 const id=await hotel.reserveHotelGroup(partnerId,{roomId:a,additionalRoomIds:[b],guest:'Group move guest',guests:1,arrival,departure});
 const before=await hotel.getHotelStay(partnerId,id);
 authorized=false;await assert.rejects(hotel.moveHotelRoom(partnerId,id,a,{moveRoomId:c,moveReason:'Guest request'}),/owner/);authorized=true;
 await hotel.moveHotelRoom(partnerId,id,a,{moveRoomId:c,moveReason:'Guest request'});
 assert.equal((await hotel.getHotelStay(partnerId,id)).groupId,before.groupId);
 assert.equal((await hotel.getHotelGroup(partnerId,id)).length,2);
 assert.equal((await hotel.listHotelRooms(partnerId)).find(room=>room.id===a).status,'Ready');
 await hotel.transitionHotelStay(partnerId,id,'cancel');
 await assert.rejects(hotel.moveHotelRoom(partnerId,id,c,{moveRoomId:a,moveReason:'Guest request'}),/Closed/);
});
test.after(async()=>{await base.businessRecord.deleteMany({where:{partnerId}});await base.$disconnect();});
