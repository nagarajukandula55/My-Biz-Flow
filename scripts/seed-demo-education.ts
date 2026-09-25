/**
 * Creates (or confirms) a standalone DEMO Education partner account, fully
 * populated with realistic dummy data across Education (Courses / Batches
 * / Students / Enrollments / Fee Installments / Class Attendance) plus the
 * cross-cutting HRMS, Marketplace, and Accounting add-ons that the
 * "education" PartnerType bundles by default (see
 * scripts/seed-new-vertical-partner-types.ts).
 *
 * Separate from src/lib/demoPartnerSeed.ts (the existing Service Centre
 * DEMO0001 account) — that file is untouched. Uses the shared helper in
 * src/lib/demoNewVerticalsShared.ts for the Partner-creation boilerplate.
 *
 * Demo id: "DEMO-EDU0001" (never a real "EDU####" id, so nextPartnerId()'s
 * per-prefix count in src/lib/partnerData.ts is never inflated).
 * Login contact: 9999910005 / password: DemoPartner@123, no OTP,
 * mustChangePassword false.
 *
 * Idempotent — every insert is guarded by an existence check, safe to
 * re-run. Does NOT run any prisma migrate/db push and does NOT touch
 * prisma/schema.prisma, prisma/migrations/, or demoPartnerSeed.ts.
 *
 * Usage: DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx tsx scripts/seed-demo-education.ts
 */
import { prisma } from "../src/lib/prisma";
import { ensureDemoVerticalPartner, mulberry32, daysAgoDate, DEMO_PASSWORD } from "../src/lib/demoNewVerticalsShared";

const DEMO_ID = "DEMO-EDU0001";
const LOGIN_CONTACT = "9999910005";

async function seedEducation(partnerId: string) {
  const existing = await prisma.course.count({ where: { partnerId } });
  if (existing > 0) {
    console.log("Education data already seeded — skipping.");
    return;
  }

  const courseJava = await prisma.course.create({ data: { partnerId, name: "Full Stack Java Development", durationWeeks: 16, fee: 4500000, isActive: true } });
  const coursePython = await prisma.course.create({ data: { partnerId, name: "Python for Data Science", durationWeeks: 12, fee: 3800000, isActive: true } });
  const courseSpoken = await prisma.course.create({ data: { partnerId, name: "Spoken English — Advanced", durationWeeks: 8, fee: 1200000, isActive: true } });

  const today = new Date();
  const day = (n: number) => new Date(today.getTime() - n * 86400000);

  const batchJava1 = await prisma.batch.create({ data: { partnerId, courseId: courseJava.id, batchName: "Java Morning Batch — Jul 2026", startDate: day(70), endDate: day(-42), status: "Ongoing", capacity: 30 } });
  const batchPython1 = await prisma.batch.create({ data: { partnerId, courseId: coursePython.id, batchName: "Python Evening Batch — Jun 2026", startDate: day(100), endDate: day(16), status: "Completed", capacity: 25 } });
  const batchSpoken1 = await prisma.batch.create({ data: { partnerId, courseId: courseSpoken.id, batchName: "Spoken English — Sep 2026", startDate: day(-2), endDate: day(-58), status: "Upcoming", capacity: 20 } });

  const studentNames = [
    "Ankit Sharma", "Bhavya Nair", "Chetan Verma", "Divya Krishnan", "Esha Kapoor",
    "Farhan Sheikh", "Gauri Patil", "Harish Reddy", "Ishita Roy", "Jatin Malhotra",
  ];

  async function enrollStudent(name: string, batch: typeof batchJava1, course: typeof courseJava, enrolledAgeDays: number, status: string, feePaidFraction: number) {
    const student = await prisma.student.create({
      data: { partnerId, name, contact: `98765${String(40000 + Math.floor(Math.random() * 9999)).slice(0, 5)}`, email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`, guardianName: null, createdAt: day(enrolledAgeDays) },
    });
    const enrollment = await prisma.enrollment.create({ data: { studentId: student.id, batchId: batch.id, enrolledAt: day(enrolledAgeDays), status } });
    const installmentCount = 2;
    const perInstallment = Math.round(course.fee / installmentCount);
    for (let i = 0; i < installmentCount; i++) {
      const dueDays = enrolledAgeDays - i * 30;
      const isPaid = i < Math.round(installmentCount * feePaidFraction);
      await prisma.feeInstallment.create({
        data: {
          enrollmentId: enrollment.id,
          dueDate: day(dueDays),
          amount: perInstallment,
          paidAt: isPaid ? day(Math.max(0, dueDays - 1)) : null,
          paidAmount: isPaid ? perInstallment : null,
        },
      });
    }
    return { student, enrollment };
  }

  const rng = mulberry32(20260925);
  const enrollments: { student: Awaited<ReturnType<typeof enrollStudent>>["student"]; enrollment: Awaited<ReturnType<typeof enrollStudent>>["enrollment"]; batch: typeof batchJava1 }[] = [];

  for (let i = 0; i < 4; i++) {
    const r = await enrollStudent(studentNames[i], batchJava1, courseJava, 65, "Active", i === 3 ? 0.5 : 1); // one with overdue balance
    enrollments.push({ ...r, batch: batchJava1 });
  }
  for (let i = 4; i < 7; i++) {
    const r = await enrollStudent(studentNames[i], batchPython1, coursePython, 95, "Completed", 1);
    enrollments.push({ ...r, batch: batchPython1 });
  }
  for (let i = 7; i < 10; i++) {
    const r = await enrollStudent(studentNames[i], batchSpoken1, courseSpoken, -1, "Active", 0.5);
    enrollments.push({ ...r, batch: batchSpoken1 });
  }

  // Class attendance for the ongoing Java batch — last 10 sessions.
  const javaEnrollments = enrollments.filter((e) => e.batch.id === batchJava1.id);
  for (let d = 1; d <= 10; d++) {
    for (const e of javaEnrollments) {
      const roll = rng();
      const status = roll < 0.8 ? "Present" : roll < 0.92 ? "Absent" : "Late";
      await prisma.classAttendance.create({ data: { batchId: batchJava1.id, studentId: e.student.id, date: day(d), status } });
    }
  }

  // Historical tail — extra completed batches/students over the last year for enrollment-trend and fee-overdue reports.
  const historyCourses = [courseJava, coursePython, courseSpoken];
  for (let b = 0; b < 4; b++) {
    const course = historyCourses[b % historyCourses.length];
    const ageDays = 130 + b * 60;
    const batch = await prisma.batch.create({
      data: { partnerId, courseId: course.id, batchName: `${course.name} — Historical Batch ${b + 1}`, startDate: day(ageDays), endDate: day(ageDays - 60), status: "Completed", capacity: 25 },
    });
    for (let s = 0; s < 6; s++) {
      const name = `${studentNames[(b * 6 + s) % studentNames.length]} ${b}${s}`;
      const student = await prisma.student.create({ data: { partnerId, name, contact: `98765${String(50000 + b * 10 + s).padStart(5, "0")}`, createdAt: day(ageDays) } });
      const enrollment = await prisma.enrollment.create({ data: { studentId: student.id, batchId: batch.id, enrolledAt: day(ageDays), status: "Completed" } });
      const paidFraction = rng() < 0.85 ? 1 : 0.5;
      const perInstallment = Math.round(course.fee / 2);
      for (let i = 0; i < 2; i++) {
        const dueDays = ageDays - i * 20;
        const isPaid = i < Math.round(2 * paidFraction);
        await prisma.feeInstallment.create({
          data: { enrollmentId: enrollment.id, dueDate: day(dueDays), amount: perInstallment, paidAt: isPaid ? day(dueDays - 1) : null, paidAmount: isPaid ? perInstallment : null },
        });
      }
    }
  }

  console.log("Education: 3 courses, 3 recent batches + 4 historical batches, 10 recent + 24 historical students with fees/attendance seeded.");
}

async function seedHrms(partnerId: string) {
  const existing = await prisma.employee.count({ where: { partnerId } });
  if (existing > 0) return;

  const office = await prisma.officeLocation.create({ data: { partnerId, name: "Coaching Centre — Kothrud", lat: 18.5074, lng: 73.8077, geofenceRadiusMeters: 150 } });

  const manager = await prisma.employee.create({ data: { partnerId, name: "Prof. Deepak Shah", designation: "Academic Director", department: "Academics", joiningDate: daysAgoDate(800), status: "Active", contact: "9999920041" } });
  const emp2 = await prisma.employee.create({ data: { partnerId, name: "Ms. Radhika Nair", designation: "Java Instructor", department: "Academics", reportingManagerId: manager.id, joiningDate: daysAgoDate(400), status: "Active", contact: "9999920042" } });
  const emp3 = await prisma.employee.create({ data: { partnerId, name: "Mr. Sameer Joshi", designation: "Python Instructor", department: "Academics", reportingManagerId: manager.id, joiningDate: daysAgoDate(250), status: "Active", contact: "9999920043" } });

  for (const emp of [manager, emp2, emp3]) {
    await prisma.leaveBalance.createMany({ data: [{ employeeId: emp.id, leaveType: "Casual", totalDays: 12, usedDays: 2 }, { employeeId: emp.id, leaveType: "Sick", totalDays: 8, usedDays: 1 }] });
    for (let d = 1; d <= 4; d++) {
      await prisma.attendanceCheckIn.create({ data: { employeeId: emp.id, checkInAt: daysAgoDate(d), checkOutAt: new Date(daysAgoDate(d).getTime() + 7 * 3600000), checkInLat: office.lat, checkInLng: office.lng, status: "Present" } });
    }
  }

  console.log("HRMS: 1 office location, 3 employees, attendance/leave data seeded.");
}

async function seedMarketplace(partnerId: string) {
  const existing = await prisma.marketplaceListing.count({ where: { partnerId } });
  if (existing > 0) return;

  await prisma.marketplaceVendor.upsert({ where: { partnerId }, create: { partnerId, isActive: true }, update: { isActive: true } });

  const listing = await prisma.marketplaceListing.create({ data: { partnerId, title: "Full Stack Java Development — Seat", description: "16-week course, morning batch.", price: 4500000, stockQuantity: 26, category: "Courses", isActive: true } });
  await prisma.marketplaceOrder.create({ data: { partnerId, listingId: listing.id, customerName: "Ankit Sharma", customerContact: "9876540001", quantity: 1, totalAmount: 4500000, status: "Confirmed", orderedAt: daysAgoDate(65) } });

  console.log("Marketplace: vendor row + 1 listing + 1 order seeded.");
}

async function seedAccounting(partnerId: string) {
  const existing = await prisma.chartOfAccount.count({ where: { partnerId } });
  if (existing > 0) return;

  const feesIncome = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "4000", accountName: "Course Fee Income", accountType: "Income" } });
  const cash = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "1000", accountName: "Cash & Bank", accountType: "Asset" } });
  const receivable = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "1200", accountName: "Fees Receivable", accountType: "Asset" } });

  const je = await prisma.journalEntry.create({ data: { partnerId, entryNumber: "JE-DEMO-0001", entryDate: daysAgoDate(65), narration: "First installment collected — Java batch enrollments", sourceType: "FeeInstallment" } });
  await prisma.journalLine.createMany({ data: [
    { journalEntryId: je.id, accountId: cash.id, debit: 9000000, credit: 0 },
    { journalEntryId: je.id, accountId: feesIncome.id, debit: 0, credit: 9000000 },
  ] });

  const je2 = await prisma.journalEntry.create({ data: { partnerId, entryNumber: "JE-DEMO-0002", entryDate: daysAgoDate(35), narration: "Second installment outstanding — accrued receivable", sourceType: "FeeInstallment" } });
  await prisma.journalLine.createMany({ data: [
    { journalEntryId: je2.id, accountId: receivable.id, debit: 2250000, credit: 0 },
    { journalEntryId: je2.id, accountId: feesIncome.id, debit: 0, credit: 2250000 },
  ] });

  const now = new Date();
  await prisma.fiscalPeriod.create({ data: { partnerId, name: `FY ${now.getFullYear()}-${now.getFullYear() + 1}`, startDate: new Date(now.getFullYear(), 3, 1), endDate: new Date(now.getFullYear() + 1, 2, 31), isClosed: false } });

  console.log("Accounting: 3 chart-of-accounts rows, 2 journal entries, 1 fiscal period seeded.");
}

async function main() {
  const { partner, alreadyExisted } = await ensureDemoVerticalPartner({
    id: DEMO_ID,
    partnerTypeId: "education",
    businessName: "Demo Coaching Institute",
    addressLine: "Paud Road, Kothrud",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411038",
    loginContact: LOGIN_CONTACT,
    businessEmail: "demo.education@mybizflow.in",
  });
  console.log(alreadyExisted ? `Partner "${partner.id}" already existed.` : `Created partner "${partner.id}".`);

  await seedEducation(partner.id);
  await seedHrms(partner.id);
  await seedMarketplace(partner.id);
  await seedAccounting(partner.id);

  console.log("\nDemo Education partner ready:");
  console.log(`  Partner ID: ${partner.id}`);
  console.log(`  Login contact: ${LOGIN_CONTACT}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
