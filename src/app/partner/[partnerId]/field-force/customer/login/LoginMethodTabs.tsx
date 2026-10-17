"use client";

import { useState } from "react";

/**
 * Switches between the phone+password form and the WhatsApp OTP form on
 * Field Force's customer login — same tab-toggle shape as the platform
 * /login page's own LoginMethodTabs (src/app/login/LoginMethodTabs.tsx),
 * duplicated here rather than shared since this route needs its own
 * partnerId-scoped otpForm and the two login pages otherwise have nothing
 * in common to warrant a shared module.
 */
export function LoginMethodTabs({
  passwordForm,
  otpForm,
}: {
  passwordForm: React.ReactNode;
  otpForm: React.ReactNode;
}) {
  const [tab, setTab] = useState<"password" | "otp">("password");

  return (
    <div>
      <div className="mt-2 flex gap-1 rounded-md bg-bg-sunken p-1">
        <button
          type="button"
          onClick={() => setTab("password")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            tab === "password" ? "bg-bg-raised text-text shadow-sm" : "text-text-muted"
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setTab("otp")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            tab === "otp" ? "bg-bg-raised text-text shadow-sm" : "text-text-muted"
          }`}
        >
          WhatsApp OTP
        </button>
      </div>

      <div className="mt-3" style={{ display: tab === "password" ? "block" : "none" }}>
        {passwordForm}
      </div>
      <div className="mt-3" style={{ display: tab === "otp" ? "block" : "none" }}>
        {otpForm}
      </div>
    </div>
  );
}
