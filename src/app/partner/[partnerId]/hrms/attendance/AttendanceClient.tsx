"use client";

import { useState, useTransition } from "react";
import { checkInAction, checkOutAction } from "./actions";

type EmployeeOption = { id: string; name: string };

export function AttendanceClient({
  partnerId,
  employees,
  openCheckIns,
}: {
  partnerId: string;
  employees: EmployeeOption[];
  /** Employee ids that already have an open (not-checked-out) check-in today. */
  openCheckIns: Set<string>;
}) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasOpenCheckIn = openCheckIns.has(employeeId);

  function getLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
    });
  }

  function handleCheckIn() {
    setError(null);
    setStatus(null);
    if (!employeeId) {
      setError("Select an employee.");
      return;
    }
    startTransition(async () => {
      try {
        const pos = await getLocation();
        const result = await checkInAction(partnerId, employeeId, pos.coords.latitude, pos.coords.longitude);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setStatus("Checked in successfully.");
        openCheckIns.add(employeeId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read your location. Location access is required to check in.");
      }
    });
  }

  function handleCheckOut() {
    setError(null);
    setStatus(null);
    if (!employeeId) {
      setError("Select an employee.");
      return;
    }
    startTransition(async () => {
      try {
        const pos = await getLocation();
        const result = await checkOutAction(partnerId, employeeId, pos.coords.latitude, pos.coords.longitude);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setStatus("Checked out successfully.");
        openCheckIns.delete(employeeId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read your location. Location access is required to check out.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border bg-bg-raised p-6 max-w-lg">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Employee</label>
        <select
          value={employeeId}
          onChange={(e) => {
            setEmployeeId(e.target.value);
            setError(null);
            setStatus(null);
          }}
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        >
          {employees.length === 0 && <option value="">No employees yet</option>}
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-sm text-text-muted">
        This will use your browser&apos;s location to verify you are at a registered office. Checking in from outside
        every registered office&apos;s geofence is blocked.
      </p>

      {error && <div className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}
      {status && <div className="mt-3 rounded-md border border-success bg-success-soft px-3 py-2 text-sm text-success">{status}</div>}

      <div className="mt-4 flex gap-3">
        <button type="button" className="btn-accent" onClick={handleCheckIn} disabled={pending || hasOpenCheckIn || !employeeId}>
          {pending ? "Working..." : "Check In"}
        </button>
        <button type="button" className="btn-outline" onClick={handleCheckOut} disabled={pending || !hasOpenCheckIn}>
          {pending ? "Working..." : "Check Out"}
        </button>
      </div>
      {hasOpenCheckIn && <p className="mt-2 text-xs text-text-muted">Already checked in today — use Check Out when leaving.</p>}
    </div>
  );
}
