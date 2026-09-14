"use client";

import { openPrintPopup } from "@/lib/openPrintPopup";

/**
 * Replaces a plain <Link> to a printable document page with a button that
 * opens it in a small popup window (see openPrintPopup) instead of
 * navigating the current tab to a full page — matches how the reference
 * app opens its Job Card/Estimate/Service Record/Invoice print views.
 * The target page itself renders with no Sidebar (see the print-route
 * check in src/app/partner/[partnerId]/layout.tsx) — this component only
 * controls HOW it's opened, not what it looks like once open.
 */
export function PrintPopupLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => openPrintPopup(href)}>
      {children}
    </button>
  );
}
