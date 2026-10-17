// Disposable localhost-only fixture for browser acceptance. Never loads .env.
const {PrismaClient}=require('@prisma/client');
const crypto=require('node:crypto');
if(process.env.MBF_ISOLATED_TEST!=='1'||process.env.DATABASE_URL!=='postgresql://ci:ci@127.0.0.1:55439/ci')throw Error('Disposable localhost database required');
const db=new PrismaClient();
const id='MOBILEQA20261008';
const planIds=[id+'-starter',id+'-pro',id+'-ultimate'];
async function main(){
 if(process.argv.includes('--clean')){
  await db.journalLine.deleteMany({where:{journalEntry:{partnerId:id}}});
  await db.journalEntry.deleteMany({where:{partnerId:id}});
  await db.chartOfAccount.deleteMany({where:{partnerId:id}});
  await db.payslip.deleteMany({where:{employee:{partnerId:id}}});
  await db.leaveRequest.deleteMany({where:{employee:{partnerId:id}}});
  await db.leaveBalance.deleteMany({where:{employee:{partnerId:id}}});
  await db.attendanceCheckIn.deleteMany({where:{employee:{partnerId:id}}});
  await db.employee.deleteMany({where:{partnerId:id}});await db.officeLocation.deleteMany({where:{partnerId:id}});
  await db.rentalAgreement.deleteMany({where:{partnerId:id}});await db.rentalAsset.deleteMany({where:{partnerId:id}});
  await db.businessRecord.deleteMany({where:{partnerId:id}});await db.moduleAccessKey.deleteMany({where:{partnerId:id}});
  await db.partner.deleteMany({where:{id}});await db.partnerType.deleteMany({where:{id}});
  await db.plan.deleteMany({where:{id:{in:planIds}}});
  console.log('Removed isolated browser fixture.');return;
 }
 const salt=crypto.randomBytes(16).toString('hex');
 const passwordHash=salt+':'+crypto.scryptSync('LocalMobileCheck!2026',salt,64).toString('hex');
 await db.$transaction(async tx=>{
  await tx.plan.createMany({data:planIds.map((planId,i)=>({id:planId,name:'Synthetic mobile tier '+i,price:100*(i+1),billingCycle:'monthly',includedModuleSlugs:['rentals','hrms','hotel','billing','accounting'],isPublic:false,maxUsers:5,maxLocations:1}))});
  await tx.partnerType.create({data:{id,planIds,defaultModules:['rentals','hrms','hotel','billing','accounting'],assignableRoleIds:['Owner']}});
  await tx.partner.create({data:{id,internalKey:id,partnerTypeId:id,planId:planIds[1],businessName:'Mobile Preview — Synthetic',city:'Test',state:'Test',pincode:'000000',businessEmail:'test@example.invalid',businessContact:id,loginContact:id,passwordHash,mustChangePassword:false,subscriptionStatus:'Active'}});
  await tx.moduleAccessKey.createMany({data:['rentals','hrms','hotel','billing','accounting'].map(moduleSlug=>({partnerId:id,moduleSlug,key:id+'-'+moduleSlug,status:'active'}))});
  const employee=await tx.employee.create({data:{partnerId:id,name:'Synthetic employee'}});
  await tx.attendanceCheckIn.create({data:{employeeId:employee.id,checkInLat:12,checkInLng:77,checkInAt:new Date('2020-01-10T03:30:00Z'),checkOutAt:new Date('2020-01-10T11:30:00Z')}});
  await tx.officeLocation.create({data:{partnerId:id,name:'Synthetic office',lat:12,lng:77,geofenceRadiusMeters:100}});
  await tx.rentalAsset.createMany({data:[{partnerId:id,assetName:'Test Camera Kit'},{partnerId:id,assetName:'Test Tripod'}]});
  const asset=await tx.rentalAsset.findFirst({where:{partnerId:id,assetName:'Test Camera Kit'}});
  await tx.rentalAgreement.create({data:{id:'qa-rental',partnerId:id,assetId:asset.id,assetName:asset.assetName,renter:'Synthetic renter',bookingStart:new Date('2030-02-01T03:30:00Z'),bookingEnd:new Date('2030-02-02T03:30:00Z'),rentalAmount:100000,depositAmount:50000,status:'Confirmed'}});
  await tx.rentalAgreement.create({data:{id:'qa-partial-rental',partnerId:id,assetId:asset.id,assetName:asset.assetName,renter:'Synthetic pooled renter',bookingStart:new Date(Date.now()-3600000),bookingEnd:new Date(Date.now()+86400000),rentalAmount:100000,depositAmount:50000,status:'Confirmed'}});
  const cash=await tx.chartOfAccount.create({data:{partnerId:id,accountCode:'100',accountName:'Synthetic Cash',accountType:'Asset'}});
  const income=await tx.chartOfAccount.create({data:{partnerId:id,accountCode:'400',accountName:'Synthetic Income',accountType:'Income'}});
  const receivable=await tx.chartOfAccount.create({data:{partnerId:id,accountCode:'110',accountName:'Synthetic Receivable',accountType:'Asset'}});
  const tax=await tx.chartOfAccount.create({data:{partnerId:id,accountCode:'200',accountName:'Synthetic Tax',accountType:'Liability'}});
  const salesLines=[{accountId:receivable.id,debit:11800,credit:0},{accountId:income.id,debit:0,credit:10000},{accountId:tax.id,debit:0,credit:1800}];
  for(const [suffix,lines] of [['INVOICE',salesLines],['CREDIT',salesLines.map(line=>({...line,debit:line.credit,credit:line.debit}))],['PAYMENT',[{accountId:cash.id,debit:11800,credit:0},{accountId:receivable.id,debit:0,credit:11800}]]]) {
   await tx.journalEntry.create({data:{partnerId:id,entryNumber:'QA-'+suffix,entryDate:new Date('2026-10-10'),lines:{create:lines}}});
  }
  await tx.journalEntry.create({data:{id:'qa-journal',partnerId:id,entryNumber:'QA-JOURNAL-1',entryDate:new Date('2020-01-10'),narration:'Synthetic reversal acceptance',lines:{create:[{accountId:cash.id,debit:10000,credit:0},{accountId:income.id,debit:0,credit:10000}]}}});
  await tx.businessRecord.createMany({data:[
   {partnerId:id,moduleSlug:'rentals-asset-policy',recordKey:asset.id,data:{stockQuantity:3,turnaroundMinutes:0,maintenanceStart:'',maintenanceEnd:'',maintenanceNotes:''}},
   {partnerId:id,moduleSlug:'rentals-terms',recordKey:'qa-partial-rental',data:{quantity:3,category:'Cameras and AV',rateUnit:'Fixed quote',ratePaise:0,pickupInstructions:'Collect from test desk',returnInstructions:'Return to test desk',cancellationTerms:'Synthetic acceptance only'}},
   ...[1,2].map(n=>({partnerId:id,moduleSlug:'hotel-rooms',recordKey:'qa-room-'+n,data:{name:'QA Room '+n,roomType:'Standard',capacity:2,ratePaise:100000,status:'Ready'}})),
   {partnerId:id,moduleSlug:'hotel-stays',recordKey:'qa-stay',data:{roomId:'qa-room-1',roomName:'QA Room 1',guest:'Synthetic guest',contact:'',guests:2,arrival:'2030-02-01',departure:'2030-02-03',ratePaise:100000,roomChargePaise:200000,status:'Confirmed',entries:[]}},
   {partnerId:id,moduleSlug:'billing',recordKey:'QA-INV-1',data:{issueDate:'2026-10-10',subtotal:100,taxAmount:18,totalAmount:118,paymentStatus:'Sent'}},
   {partnerId:id,moduleSlug:'billing-credit-notes',recordKey:'QA-CN-1',data:{issueDate:'2026-10-10',linkedInvoiceId:'QA-INV-1',noteType:'Credit Note',subtotal:100,taxAmount:18,totalAmount:118}},
   {partnerId:id,moduleSlug:'billing-payments',recordKey:'QA-PAY-1',data:{date:'2026-10-10',invoiceId:'QA-INV-1',amount:118}}
  ]});
 });console.log('Created isolated browser fixture '+id);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
