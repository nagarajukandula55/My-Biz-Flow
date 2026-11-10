"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type Role = "business" | "customer" | "provider";

export function UnifiedLoginForm({ action, otpForm, initialRole = "business" }: { action: (formData: FormData) => void; otpForm?: ReactNode; initialRole?: Role }) {
  const [role, setRole] = useState<Role>(initialRole);
  const isBusiness = role === "business";
  return (
    <div className="mt-6">
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-md bg-bg-sunken p-1 text-xs">
        {(["business", "customer", "provider"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setRole(item)} className={role === item ? "rounded bg-bg-raised px-2 py-2 font-semibold text-text shadow-sm" : "rounded px-2 py-2 text-text-muted"}>
            {item === "business" ? "Business / Staff" : item === "customer" ? "Customer" : "Service Provider"}
          </button>
        ))}
      </div>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="role" value={role} />
        {!isBusiness && <label className="text-sm font-medium text-text">Partner ID<input name="partnerId" required placeholder="FF0001" className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal" /></label>}
        <label className="text-sm font-medium text-text">{isBusiness ? "Partner ID or Contact Number" : "Registered Phone Number"}<input name="identifier" required placeholder={isBusiness ? "VND#### / 98xxxxxxxx" : "98xxxxxxxx"} className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal" /></label>
        <label className="text-sm font-medium text-text">Password<input type="password" name="password" required className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal" /></label>
        {isBusiness && <div className="text-right"><a href="/forgot-password" className="text-xs font-semibold text-teal hover:underline">Forgot password?</a></div>}
        <button type="submit" className="btn-accent mt-2 w-full">Sign in</button>
      </form>
      {isBusiness && otpForm && <div className="mt-4">{otpForm}</div>}
      {!isBusiness && <p className="mt-3 text-xs text-text-muted">Use the partner ID shown in your registration or invitation.</p>}
    </div>
  );
}
