/** Explicit owner-selected working days; attendance is credited once per IST day. */
export function calculateAttendancePayroll(input: { month: number; year: number; workingWeekdays: number[]; excludedDates: string[]; paidLeaveDays: number; basicPayPaise: number; rows: { id: string; checkInAt: Date; checkOutAt: Date | null; status: string }[] }) {
  const { month, year } = input;
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1900 || year > 2200) throw new Error("Select a valid payroll period.");
  if (!input.workingWeekdays.length || input.workingWeekdays.some(n => !Number.isInteger(n) || n < 0 || n > 6)) throw new Error("Select working weekdays.");
  if (!Number.isSafeInteger(input.basicPayPaise) || input.basicPayPaise < 0 || input.basicPayPaise > 2147483647) throw new Error("Enter a valid basic salary.");
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const validDates = new Set(Array.from({ length: days }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`));
  if (input.excludedDates.some(d => !validDates.has(d))) throw new Error("Holiday dates must be valid dates in the selected month.");
  const scheduled = [...validDates].filter(d => input.workingWeekdays.includes(new Date(`${d}T00:00:00Z`).getUTCDay()) && !input.excludedDates.includes(d));
  if (!scheduled.length) throw new Error("The selected policy has no working days.");
  const credits = new Map<string, number>();
  for (const row of input.rows) {
    const date = new Date(row.checkInAt.getTime() + 330 * 60000).toISOString().slice(0, 10);
    if (!scheduled.includes(date)) continue;
    if (!row.checkOutAt) throw new Error("Close all attendance shifts in this period before calculating payroll.");
    if (!["Present", "Late", "HalfDay"].includes(row.status)) throw new Error("Review unsupported attendance statuses before calculating payroll.");
    credits.set(date, Math.max(credits.get(date) ?? 0, row.status === "HalfDay" ? 0.5 : 1));
  }
  const attendanceDays = [...credits.values()].reduce((a, b) => a + b, 0);
  if (!Number.isFinite(input.paidLeaveDays) || input.paidLeaveDays < 0 || !Number.isInteger(input.paidLeaveDays * 2) || input.paidLeaveDays + attendanceDays > scheduled.length) throw new Error("Paid leave credits must be half-day increments and cannot exceed missing working days.");
  const unpaidDays = scheduled.length - attendanceDays - input.paidLeaveDays;
  return { workingDays: scheduled.length, attendanceDays, paidLeaveDays: input.paidLeaveDays, unpaidDays, attendanceDeductionPaise: Math.round(input.basicPayPaise * unpaidDays / scheduled.length), creditedDates: Object.fromEntries(credits) };
}
