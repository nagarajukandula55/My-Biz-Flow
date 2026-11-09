"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/field-force-sw.js", { scope: "/" }).catch(() => undefined);
    }
  }, []);
  return null;
}
