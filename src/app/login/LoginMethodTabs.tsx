"use client";

import { useState } from "react";

/**
 * Switches between the password form (passed as `passwordForm`) and the
 * WhatsApp OTP form (`otpForm`) on /login — both stay mounted in the DOM
 * (no unmount/remount), just toggled with a class, so step state inside
 * WhatsAppOtpLoginForm survives a tab switch and back.
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
      <div className="mt-4 flex gap-1 rounded-md bg-bg-sunken p-1">
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

      <div className="mt-4" style={{ display: tab === "password" ? "block" : "none" }}>
        {passwordForm}
      </div>
      <div className="mt-4" style={{ display: tab === "otp" ? "block" : "none" }}>
        {otpForm}
      </div>
    </div>
  );
}
