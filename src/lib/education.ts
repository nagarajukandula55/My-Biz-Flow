/**
 * Prisma-backed data access for the Education / Coaching module's real
 * tables (Course, Batch, Student, Enrollment, FeeInstallment,
 * ClassAttendance — see prisma/schema.prisma). Replaces the old
 * BusinessRecord-backed "education"/"education-batches" storage for
 * Courses/Students/Batches; Course/Batch/Student carry their own
 * `partnerId` column directly, while Enrollment/FeeInstallment/
 * ClassAttendance are tenant-scoped only via their parent Batch/Student
 * (see each model's doc comment in schema.prisma) — every function below
 * that touches one of those always re-checks the parent's partnerId first
 * (assertPartnerScope), fail-closed, same convention as src/lib/tenant.ts.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { getPartner } from "@/lib/partnerData";
import { educationEnrollmentConfirmedMessage } from "@/lib/telegramTemplates";
import { sendEducationEnrollmentConfirmedEmail } from "@/lib/email/moduleEmails";

// --- Courses ---------------------------------------------------------

export async function listCourses(partnerId: string) {
  return prisma.course.findMany({ where: { partnerId }, orderBy: { name: "asc" } });
}

export async function getCourse(partnerId: string, id: string) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) return null;
  assertPartnerScope(partnerId, course.partnerId);
  return course;
}

export async function createCourse(
  partnerId: string,
  data: { name: string; durationWeeks?: number | null; fee: number; isActive?: boolean }
) {
  return prisma.course.create({
    data: {
      partnerId,
      name: data.name,
      durationWeeks: data.durationWeeks ?? null,
      fee: data.fee,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateCourse(
  partnerId: string,
  id: string,
  data: { name?: string; durationWeeks?: number | null; fee?: number; isActive?: boolean }
) {
  const existing = await getCourse(partnerId, id); // throws on cross-tenant / null-safe below
  if (!existing) return null;
  return prisma.course.update({ where: { id }, data });
}

// --- Students ----------------------------------------------------------

export async function listStudents(partnerId: string) {
  return prisma.student.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } });
}

export async function getStudent(partnerId: string, id: string) {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return null;
  assertPartnerScope(partnerId, student.partnerId);
  return student;
}

export async function createStudent(
  partnerId: string,
  data: { name: string; contact?: string | null; email?: string | null; guardianName?: string | null; guardianContact?: string | null }
) {
  return prisma.student.create({
    data: {
      partnerId,
      name: data.name,
      contact: data.contact ?? null,
      email: data.email ?? null,
      guardianName: data.guardianName ?? null,
      guardianContact: data.guardianContact ?? null,
    },
  });
}

export async function updateStudent(
  partnerId: string,
  id: string,
  data: { name?: string; contact?: string | null; email?: string | null; guardianName?: string | null; guardianContact?: string | null }
) {
  const existing = await getStudent(partnerId, id);
  if (!existing) return null;
  return prisma.student.update({ where: { id }, data });
}

// --- Batches -------------------------------------------------------------

export async function listBatches(partnerId: string) {
  return prisma.batch.findMany({
    where: { partnerId },
    include: { course: true },
    orderBy: { startDate: "desc" },
  });
}

export async function getBatch(partnerId: string, id: string) {
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!batch) return null;
  assertPartnerScope(partnerId, batch.partnerId);
  return batch;
}

export async function createBatch(
  partnerId: string,
  data: {
    courseId: string;
    batchName: string;
    startDate?: Date | null;
    endDate?: Date | null;
    status?: string;
    capacity?: number | null;
  }
) {
  const course = await getCourse(partnerId, data.courseId);
  if (!course) throw new Error("Course not found for this partner.");
  return prisma.batch.create({
    data: {
      partnerId,
      courseId: data.courseId,
      batchName: data.batchName,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      status: data.status ?? "Upcoming",
      capacity: data.capacity ?? null,
    },
  });
}

export async function updateBatch(
  partnerId: string,
  id: string,
  data: { courseId?: string; batchName?: string; startDate?: Date | null; endDate?: Date | null; status?: string; capacity?: number | null }
) {
  const existing = await getBatch(partnerId, id);
  if (!existing) return null;
  return prisma.batch.update({ where: { id }, data });
}

// --- Enrollments -----------------------------------------------------

/** Active (non Dropped/Completed) enrollment count for a batch — the capacity check's numerator. */
export async function countActiveEnrollments(batchId: string): Promise<number> {
  return prisma.enrollment.count({ where: { batchId, status: "Active" } });
}

export async function listEnrollmentsForBatch(partnerId: string, batchId: string) {
  const batch = await getBatch(partnerId, batchId); // throws/null-checks tenant scope
  if (!batch) return [];
  return prisma.enrollment.findMany({
    where: { batchId },
    include: { student: true, feeInstallments: true },
    orderBy: { enrolledAt: "desc" },
  });
}

/** Students not already actively enrolled in this batch — the enroll form's candidate list. */
export async function listAvailableStudentsForBatch(partnerId: string, batchId: string) {
  const batch = await getBatch(partnerId, batchId);
  if (!batch) return [];
  const enrolled = await prisma.enrollment.findMany({
    where: { batchId, status: "Active" },
    select: { studentId: true },
  });
  const enrolledIds = new Set(enrolled.map((e) => e.studentId));
  const students = await listStudents(partnerId);
  return students.filter((s) => !enrolledIds.has(s.id));
}

export class BatchAtCapacityError extends Error {
  constructor(message = "This batch is at full capacity.") {
    super(message);
    this.name = "BatchAtCapacityError";
  }
}

/**
 * Enrolls a student into a batch, fail-closed against Batch.capacity —
 * counts existing Active enrollments and refuses (throws
 * BatchAtCapacityError) if capacity is set and already met/exceeded. A null
 * capacity means "unlimited", same convention as the old maxSeats field.
 * Fires the educationEnrollmentConfirmed Telegram alert live on success.
 */
export async function createEnrollment(partnerId: string, batchId: string, studentId: string) {
  const batch = await getBatch(partnerId, batchId);
  if (!batch) throw new Error("Batch not found for this partner.");
  const student = await getStudent(partnerId, studentId);
  if (!student) throw new Error("Student not found for this partner.");

  if (batch.capacity != null && batch.capacity > 0) {
    const activeCount = await countActiveEnrollments(batchId);
    if (activeCount >= batch.capacity) {
      throw new BatchAtCapacityError();
    }
  }

  const enrollment = await prisma.enrollment.create({
    data: { studentId, batchId, status: "Active" },
  });

  const partner = await getPartner(partnerId);
  if (partner) {
    const message = await educationEnrollmentConfirmedMessage({
      partnerBusinessName: partner.businessName,
      studentName: student.name,
      batchName: batch.batchName,
      courseName: batch.course.name,
    });
    await sendPartnerTelegramAlert(partnerId, "educationEnrollmentConfirmed", message);
    // Email only if the student has a real email on file — Student.email is optional.
    if (student.email) {
      await sendEducationEnrollmentConfirmedEmail({
        to: student.email,
        partnerBusinessName: partner.businessName,
        studentName: student.name,
        batchName: batch.batchName,
        courseName: batch.course.name,
      });
    }
  }

  return enrollment;
}

export async function updateEnrollmentStatus(partnerId: string, enrollmentId: string, status: string) {
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId }, include: { batch: true } });
  if (!enrollment) return null;
  assertPartnerScope(partnerId, enrollment.batch.partnerId);
  return prisma.enrollment.update({ where: { id: enrollmentId }, data: { status } });
}

async function getEnrollmentScoped(partnerId: string, enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId }, include: { batch: true } });
  if (!enrollment) return null;
  assertPartnerScope(partnerId, enrollment.batch.partnerId);
  return enrollment;
}

// --- Fee installments --------------------------------------------------

export async function listFeeInstallmentsForEnrollment(partnerId: string, enrollmentId: string) {
  const enrollment = await getEnrollmentScoped(partnerId, enrollmentId);
  if (!enrollment) return [];
  return prisma.feeInstallment.findMany({ where: { enrollmentId }, orderBy: { dueDate: "asc" } });
}

export async function addFeeInstallment(
  partnerId: string,
  enrollmentId: string,
  data: { dueDate: Date; amount: number }
) {
  const enrollment = await getEnrollmentScoped(partnerId, enrollmentId);
  if (!enrollment) throw new Error("Enrollment not found for this partner.");
  return prisma.feeInstallment.create({
    data: { enrollmentId, dueDate: data.dueDate, amount: data.amount },
  });
}

export async function markFeeInstallmentPaid(partnerId: string, installmentId: string, paidAmount: number) {
  const installment = await prisma.feeInstallment.findUnique({
    where: { id: installmentId },
    include: { enrollment: { include: { batch: true } } },
  });
  if (!installment) return null;
  assertPartnerScope(partnerId, installment.enrollment.batch.partnerId);
  return prisma.feeInstallment.update({
    where: { id: installmentId },
    data: { paidAt: new Date(), paidAmount },
  });
}

/** Fee summary (due/paid/outstanding, in paise) for one enrollment. */
export function summarizeFeeInstallments(installments: { amount: number; paidAmount: number | null }[]) {
  const totalDue = installments.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = installments.reduce((sum, i) => sum + (i.paidAmount ?? 0), 0);
  return { totalDue, totalPaid, outstanding: totalDue - totalPaid };
}

// --- Class attendance ----------------------------------------------------

export async function listClassAttendanceForBatchDate(partnerId: string, batchId: string, date: Date) {
  const batch = await getBatch(partnerId, batchId);
  if (!batch) return [];
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return prisma.classAttendance.findMany({
    where: { batchId, date: { gte: start, lt: end } },
  });
}

/**
 * Create-or-update one ClassAttendance row for (batchId, studentId, date).
 * ClassAttendance has no DB-level unique constraint on (batchId, studentId,
 * date) (see schema.prisma's doc comment on the model), so this is a
 * query-then-create-or-update, matching the OtpCode table's same documented
 * convention elsewhere in this schema.
 */
export async function upsertClassAttendance(
  partnerId: string,
  batchId: string,
  studentId: string,
  date: Date,
  status: "Present" | "Absent" | "Late"
) {
  const batch = await getBatch(partnerId, batchId);
  if (!batch) throw new Error("Batch not found for this partner.");
  const student = await getStudent(partnerId, studentId);
  if (!student) throw new Error("Student not found for this partner.");

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const existing = await prisma.classAttendance.findFirst({
    where: { batchId, studentId, date: { gte: start, lt: end } },
  });

  if (existing) {
    return prisma.classAttendance.update({ where: { id: existing.id }, data: { status } });
  }
  return prisma.classAttendance.create({ data: { batchId, studentId, date: start, status } });
}
