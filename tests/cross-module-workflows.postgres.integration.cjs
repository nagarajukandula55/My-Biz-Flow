const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./loadModule.cjs');
if (process.env.MBF_ISOLATED_TEST !== '1' || process.env.DATABASE_URL !== 'postgresql://ci:ci@127.0.0.1:55439/ci') throw Error('Disposable local database required');
const { PrismaClient } = require('@prisma/client');
const base = new PrismaClient();
const db = load('src/lib/databaseTransaction.ts', { 'node:async_hooks': require('node:async_hooks'), '@/lib/databaseClientContext': load('src/lib/databaseClientContext.ts') });
const prisma = db.transactionAwareClient(base);
const lock = load('src/lib/withRecordLock.ts', { '@/lib/prisma': { prisma }, '@/lib/databaseTransaction': db });
const partnerId = 'cross-workflow-' + crypto.randomUUID();
const foreignId = partnerId + '-other';
let deliveries = 0;
const education = load('src/lib/education.ts', {
  '@/lib/prisma': { prisma }, '@/lib/withRecordLock': lock, '@/lib/databaseTransaction': db,
  '@/lib/tenant': { assertPartnerScope: (expected, actual) => { if (expected !== actual) throw Error('Partner scope mismatch'); } },
  '@/lib/partnerData': { getPartner: async () => ({ businessName: 'Synthetic school' }) },
  '@/lib/telegram': { sendPartnerTelegramAlert: async () => { assert.equal(db.inDatabaseTransaction(), false); deliveries++; } },
  '@/lib/telegramTemplates': { educationEnrollmentConfirmedMessage: async () => 'Synthetic enrollment' },
  '@/lib/email/moduleEmails': { sendEducationEnrollmentConfirmedEmail: async () => {} },
});

test('Education enrolls within capacity, records attendance and fees, completes and isolates tenants', async () => {
  const course = await education.createCourse(partnerId, { name: 'Test course', fee: 10000 });
  const foreign = await education.createCourse(foreignId, { name: 'Private course', fee: 20000 });
  const batch = await education.createBatch(partnerId, { courseId: course.id, batchName: 'One seat', capacity: 1 });
  await assert.rejects(education.createBatch(partnerId, { courseId: course.id, batchName: 'Invalid seats', capacity: -1 }), /positive/);
  const students = await Promise.all(['First', 'Second'].map(name => education.createStudent(partnerId, { name })));
  await assert.rejects(education.updateBatch(partnerId, batch.id, { courseId: foreign.id }), /scope/);
  const results = await Promise.allSettled(students.map(student => education.createEnrollment(partnerId, batch.id, student.id)));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const enrollment = results.find(result => result.status === 'fulfilled').value;
  assert.equal(deliveries, 1);
  await assert.rejects(education.createEnrollment(partnerId, batch.id, enrollment.studentId), /already/);
  await assert.rejects(education.listEnrollmentsForBatch(foreignId, batch.id), /scope/);
  await Promise.all(['Present', 'Late'].map(status => education.upsertClassAttendance(partnerId, batch.id, enrollment.studentId, new Date('2030-01-10'), status)));
  assert.equal((await education.listClassAttendanceForBatchDate(partnerId, batch.id, new Date('2030-01-10'))).length, 1);
  const unenrolled = students.find(student => student.id !== enrollment.studentId);
  await assert.rejects(education.upsertClassAttendance(partnerId, batch.id, unenrolled.id, new Date('2030-01-10'), 'Present'), /actively enrolled/);
  const fee = await education.addFeeInstallment(partnerId, enrollment.id, { dueDate: new Date('2030-01-15'), amount: 10000 });
  await assert.rejects(education.addFeeInstallment(partnerId, enrollment.id, { dueDate: new Date('2030-01-15'), amount: -100 }), /positive/);
  await assert.rejects(education.markFeeInstallmentPaid(foreignId, fee.id, 10000), /scope/);
  await education.markFeeInstallmentPaid(partnerId, fee.id, 10000);
  await assert.rejects(education.markFeeInstallmentPaid(partnerId, fee.id, 10001), /cannot exceed/);
  await assert.rejects(education.markFeeInstallmentPaid(partnerId, fee.id, 100), /cannot be reduced/);
  const paid = await education.markFeeInstallmentPaid(partnerId, fee.id, 10000);
  assert.equal(paid.paidAmount, 10000);
  const summary = education.summarizeFeeInstallments(await education.listFeeInstallmentsForEnrollment(partnerId, enrollment.id));
  assert.equal(summary.outstanding, 0);
  await education.updateEnrollmentStatus(partnerId, enrollment.id, 'Completed');
  const replacement = await education.createEnrollment(partnerId, batch.id, unenrolled.id);
  await assert.rejects(education.updateEnrollmentStatus(partnerId, enrollment.id, 'Active'), /capacity/);
  await education.updateBatch(partnerId, batch.id, { capacity: 2 });
  await education.updateEnrollmentStatus(partnerId, enrollment.id, 'Active');
  await assert.rejects(education.updateBatch(partnerId, batch.id, { capacity: 1 }), /below active/);
  assert.equal((await education.listEnrollmentsForBatch(partnerId, batch.id)).length, 2);
  await education.updateEnrollmentStatus(partnerId, replacement.id, 'Dropped');
});

test('Education rollback does not send confirmation or retain enrollment', async () => {
  const course = await education.createCourse(partnerId, { name: 'Rollback course', fee: 0 });
  const batch = await education.createBatch(partnerId, { courseId: course.id, batchName: 'Rollback' });
  const student = await education.createStudent(partnerId, { name: 'Rollback student' });
  const before = deliveries;
  await assert.rejects(lock.withRecordLock('education-batch', batch.id, async () => {
    await education.createEnrollment(partnerId, batch.id, student.id);
    throw Error('Forced rollback');
  }), /Forced rollback/);
  assert.equal(deliveries, before);
  assert.equal((await education.listEnrollmentsForBatch(partnerId, batch.id)).length, 0);
});

const manufacturing = load('src/lib/manufacturing.ts', { '@/lib/prisma': { prisma }, '@/lib/withRecordLock': lock, '@/lib/manufacturingTypes': load('src/lib/manufacturingTypes.ts') });
const manufacturingActions = load('src/app/partner/[partnerId]/manufacturing/actions.ts', {
  '@/lib/manufacturing': manufacturing,
  '@/lib/manufacturingStockPolicy': {}, '@/lib/inventoryAction': {}, '@/lib/databaseTransaction': db,
  'next/navigation': {}, 'next/cache': {}, '@/lib/inventoryStock': {}, '@/lib/businessRecords': {},
  '@/lib/requirePartnerSession': { requireSessionPartnerId: async id => id },
  '@/lib/telegram': {}, '@/lib/partnerData': {}, '@/lib/telegramTemplates': {},
});

test('Manufacturing keeps BOM and work center within tenant and records atomic immutable completion history', async () => {
  const bom = await manufacturing.createBom(partnerId, { productName: 'Synthetic product', lines: [{ materialId: 'synthetic-material', materialLabel: 'Material', quantity: 2, unitCost: 100 }] });
  const foreignBom = await manufacturing.createBom(foreignId, { productName: 'Private product', lines: [] });
  const center = await manufacturing.createWorkCenter(partnerId, { name: 'Assembly' });
  const foreignCenter = await manufacturing.createWorkCenter(foreignId, { name: 'Private assembly' });
  const input = { productName: 'Synthetic product', bomId: bom.id, workCenterId: center.id, quantityPlanned: 5 };
  await assert.rejects(manufacturing.createProductionOrder(partnerId, { ...input, bomId: foreignBom.id }), /not found for this partner/);
  await assert.rejects(manufacturing.createProductionOrder(partnerId, { ...input, workCenterId: foreignCenter.id }), /not found for this partner/);
  const order = await manufacturing.createProductionOrder(partnerId, input);
  assert.match((await manufacturingActions.setProductionOrderStatusAction(partnerId, order.id, 'Completed')).error, /Complete production/);
  assert.equal((await manufacturing.getProductionOrder(partnerId, order.id)).status, 'Planned');
  assert.equal(await manufacturing.getProductionOrder(foreignId, order.id), null);
  await assert.rejects(manufacturing.updateProductionOrder(partnerId, order.id, { ...input, bomId: foreignBom.id }), /not found for this partner/);
  await manufacturing.setProductionOrderStatus(partnerId, order.id, 'InProduction');
  await assert.rejects(lock.withRecordLock('inventory-partner', partnerId, async () => {
    await manufacturing.setProductionOrderStatus(partnerId, order.id, 'QC');
    throw Error('Stage rollback');
  }), /Stage rollback/);
  assert.equal((await manufacturing.getProductionOrder(partnerId, order.id)).status, 'InProduction');
  await manufacturing.setProductionOrderStatus(partnerId, order.id, 'QC');
  await Promise.all([1, 2].map(() => manufacturing.setProductionOrderStatus(partnerId, order.id, 'Completed', 'Synthetic completion DAL test')));
  const completed = await manufacturing.getProductionOrder(partnerId, order.id);
  assert.equal(completed.stageHistory.length, 4);
  assert.ok(completed.actualCompletionDate);
  await assert.rejects(manufacturing.setProductionOrderStatus(partnerId, order.id, 'Planned'), /cannot be reopened/);
  await assert.rejects(manufacturing.updateProductionOrder(partnerId, order.id, input), /cannot be edited/);
});

test.after(async () => {
  const scope = { partnerId: { in: [partnerId, foreignId] } };
  await base.productionStageHistory.deleteMany({ where: { productionOrder: scope } });
  await base.productionOrder.deleteMany({ where: scope });
  await base.bomLine.deleteMany({ where: { bom: scope } });
  await base.billOfMaterial.deleteMany({ where: scope });
  await base.workCenter.deleteMany({ where: scope });
  await base.classAttendance.deleteMany({ where: { batch: scope } });
  await base.feeInstallment.deleteMany({ where: { enrollment: { batch: scope } } });
  await base.enrollment.deleteMany({ where: { batch: scope } });
  await base.batch.deleteMany({ where: scope });
  await base.student.deleteMany({ where: scope });
  await base.course.deleteMany({ where: scope });
  await base.$disconnect();
});
