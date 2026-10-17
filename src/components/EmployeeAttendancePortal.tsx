"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RecordForm } from "./RecordForm";
import { employeeLoginAction, employeePasswordAction, employeeLogoutAction, employeePunchAction } from "@/app/partner/[partnerId]/hrms/employee/actions";

export function EmployeeAttendancePortal({ partnerId, name, temporary, open }: { partnerId: string; name?: string; temporary?: boolean; open: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function punch(mode: "in" | "out") {
    setBusy(true); setMessage(""); setFailed(false);
    try {
      if (!navigator.geolocation) throw new Error("This browser does not support location. Use a supported browser with precise location enabled.");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }));
      const result = await employeePunchAction(partnerId, mode, { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: position.timestamp });
      setFailed(!result.ok);
      setMessage(result.ok ? (mode === "in" ? "Checked in successfully." : "Checked out successfully.") : result.error);
      if (result.ok) router.refresh();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Location could not be read. Allow precise location in your browser settings and retry.");
    } finally { setBusy(false); }
  }
  return <section className="space-y-4">
    {!name ? <RecordForm fields={[
      { key: "loginId", label: "Employee login ID", type: "text", required: true },
      { key: "password", label: "Password", type: "password", required: true },
    ]} submitLabel="Sign in" action={async values => { const result = await employeeLoginAction(partnerId, values); if (!result.error) router.refresh(); return result; }} />
    : temporary ? <><p className="text-sm text-text-muted">Welcome, {name}. Replace your temporary password before recording attendance.</p><RecordForm fields={[
      { key: "password", label: "New password (at least 12 characters)", type: "password", required: true },
      { key: "confirmation", label: "Confirm password", type: "password", required: true },
    ]} submitLabel="Set password" action={async values => { const result = await employeePasswordAction(partnerId, values); if (!result.error) router.refresh(); return result; }} /></>
    : <><h2 className="font-display text-xl font-bold text-text">{name}</h2>
      <p className="text-sm text-text-muted">{open ? "Your shift is open. Check out when leaving." : "You are currently checked out."}</p>
      <p className="text-sm text-text-muted">Location is requested only when you punch, and must be fresh and accurate within 100 metres. Check-in follows your assigned work policy: registered office geofences unless your owner has explicitly enabled remote / field attendance. Checkout records your location without blocking departure outside the office. No continuous tracking or facial recognition is used.</p>
      <div className="flex flex-wrap gap-3"><button className="btn-accent min-h-11" disabled={busy || open} onClick={() => punch("in")}>Check in</button>
        <button className="btn-outline min-h-11" disabled={busy || !open} onClick={() => punch("out")}>Check out</button></div>
      {busy && <p role="status">Reading location and saving attendance…</p>}
      {message && <p role={failed ? "alert" : "status"} className={failed ? "text-danger" : "text-success"}>{message}</p>}</>}
    {name && <button className="btn-outline min-h-11" disabled={busy} onClick={async () => { await employeeLogoutAction(); router.refresh(); }}>Sign out</button>}
  </section>;
}
