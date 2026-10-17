"use client";
import { useState } from "react";
import { RecordForm } from "./RecordForm";
import { employeeAccessAction } from "@/app/partner/[partnerId]/hrms/employee-access/actions";
export function EmployeeAccessForm({ partnerId, employees }: { partnerId: string; employees: { id: string; name: string }[] }) {
  const [issued, setIssued] = useState<{ loginId: string; password: string } | null>(null);
  return <><RecordForm fields={[
    { key: "employeeId", label: "Employee", type: "select", options: employees.map(e => e.id), optionLabels: Object.fromEntries(employees.map(e => [e.id, e.name])), required: true },
    { key: "operation", label: "Action", type: "select", options: ["Issue or reset password", "Disable"], required: true },
  ]} submitLabel="Update employee access" action={async values => {
    setIssued(null);
    try { setIssued(await employeeAccessAction(partnerId, values)); return {}; }
    catch (error) { return { error: error instanceof Error ? error.message : "Could not update access." }; }
  }} />
  {issued && <div className="mt-4 space-y-2" role="status"><p>Employee login ID: <strong className="break-all font-mono">{issued.loginId}</strong></p>
    {issued.password ? <><p>Temporary password: <strong className="break-all font-mono">{issued.password}</strong></p><p className="text-sm text-text-muted">Shown only now. Share privately with this employee; they must replace it at first sign-in. Resetting invalidates previous sessions.</p></> : <p>Attendance login disabled.</p>}</div>}</>;
}
