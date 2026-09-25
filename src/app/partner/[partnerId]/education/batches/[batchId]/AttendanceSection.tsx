"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markClassAttendanceAction } from "../actions";

type StudentRow = { id: string; name: string };
type AttendanceStatus = "Present" | "Absent" | "Late";

export function AttendanceSection({
  partnerId,
  batchId,
  date,
  students,
  initialStatuses,
}: {
  partnerId: string;
  batchId: string;
  date: string; // YYYY-MM-DD
  students: StudentRow[];
  initialStatuses: Record<string, AttendanceStatus>;
}) {
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | undefined>>(initialStatuses);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setStatus(studentId: string, status: AttendanceStatus) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
    startTransition(async () => {
      await markClassAttendanceAction(partnerId, batchId, studentId, date, status);
    });
  }

  function goToDate(nextDate: string) {
    router.push(`/partner/${partnerId}/education/batches/${batchId}?date=${nextDate}`);
  }

  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    goToDate(d.toISOString().slice(0, 10));
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-text">Class Attendance</h2>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-outline text-xs" onClick={() => shiftDate(-1)}>
            &larr;
          </button>
          <input
            type="date"
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-xs text-text"
            value={date}
            onChange={(e) => goToDate(e.target.value)}
          />
          <button type="button" className="btn-outline text-xs" onClick={() => shiftDate(1)}>
            &rarr;
          </button>
        </div>
      </div>

      {students.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">No actively enrolled students to mark attendance for.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pb-1">Student</th>
              <th className="pb-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const current = statuses[s.id];
              return (
                <tr key={s.id} className="border-t border-border/50">
                  <td className="py-2">{s.name}</td>
                  <td className="py-2">
                    <div className="flex gap-1.5">
                      {(["Present", "Absent", "Late"] as AttendanceStatus[]).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          disabled={pending}
                          onClick={() => setStatus(s.id, opt)}
                          className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                            current === opt
                              ? opt === "Present"
                                ? "border-success bg-success-soft text-success"
                                : opt === "Absent"
                                  ? "border-danger bg-danger-soft text-danger"
                                  : "border-warning bg-warning-soft text-warning"
                              : "border-border text-text-muted"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
