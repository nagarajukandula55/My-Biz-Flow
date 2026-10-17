const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');
const { calculateAttendancePayroll: calculate } = load('src/lib/hrmsPayrollCalculation.ts');
const base = { month: 2, year: 2024, workingWeekdays: [1, 2, 3, 4, 5], excludedDates: [], paidLeaveDays: 0, basicPayPaise: 210000, rows: [] };
const shift = (id, date, status = 'Present') => ({ id, checkInAt: new Date(date), checkOutAt: new Date('2024-02-02T10:00:00Z'), status });
test('attendance payroll counts IST days once, supports half days and explicit leave', () => {
  const result = calculate({ ...base, paidLeaveDays: 1, rows: [shift('a', '2024-01-31T19:00:00Z'), shift('b', '2024-02-01T06:00:00Z'), shift('c', '2024-02-02T06:00:00Z', 'HalfDay')] });
  assert.equal(result.workingDays, 21);
  assert.equal(result.attendanceDays, 1.5);
  assert.equal(result.unpaidDays, 18.5);
  assert.equal(result.attendanceDeductionPaise, 185000);
});
test('holidays are excluded and late attendance counts as full day', () => {
  const result = calculate({ ...base, excludedDates: ['2024-02-01'], rows: [shift('a', '2024-02-01T06:00:00Z'), shift('b', '2024-02-02T06:00:00Z', 'Late')] });
  assert.equal(result.workingDays, 20);
  assert.equal(result.attendanceDays, 1);
});
test('invalid credits, dates, policies and unfinished shifts fail closed', () => {
  for (const changed of [{ paidLeaveDays: 22 }, { paidLeaveDays: .1 }, { excludedDates: ['2024-02-30'] }, { workingWeekdays: [] }, { basicPayPaise: NaN }, { rows: [{ ...shift('a', '2024-02-01T06:00:00Z'), checkOutAt: null }] }]) assert.throws(() => calculate({ ...base, ...changed }));
});
