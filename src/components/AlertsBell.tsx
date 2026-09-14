"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { Alert, AlertSeverity } from "@/lib/alerts";

const DOT_CLASS: Record<AlertSeverity, string> = {
  danger: "bg-danger",
  warning: "bg-accent",
  info: "bg-teal",
};

const PREVIEW_COUNT = 6;

/**
 * The sidebar alert bell. Purely presentational — the alert list is
 * computed on the server (computeAlerts, src/lib/alerts.ts) in the partner
 * layout and passed down, so there is no client-side fetch-for-UI here and
 * the badge count is always real current data rather than something polled
 * or cached in the browser.
 *
 * "Unread" is deliberately not modelled: an alert exists only while the
 * condition that produced it is still true, so there is nothing to mark
 * read — fixing the underlying record is what dismisses it.
 */
export function AlertsBell({ partnerId, alerts }: { partnerId: string; alerts: Alert[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const count = alerts.length;
  const preview = alerts.slice(0, PREVIEW_COUNT);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={count === 0 ? "Alerts" : `Alerts (${count})`}
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-sidebar-text-dim hover:bg-sidebar-active/60 hover:text-sidebar-text"
      >
        <Bell className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-80 overflow-hidden rounded-md border border-border bg-bg-raised shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wide text-text-muted">Alerts</span>
            <span className="text-xs text-text-muted">{count}</span>
          </div>

          {count === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">
              Nothing needs your attention right now.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {preview.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/partner/${partnerId}/${a.href}`}
                    onClick={() => setOpen(false)}
                    className="flex gap-2.5 px-3 py-2.5 hover:bg-bg-sunken"
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${DOT_CLASS[a.severity]}`} />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-text">{a.title}</span>
                      <span className="mt-0.5 block text-xs text-text-muted">{a.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {count > preview.length && (
            <Link
              href={`/partner/${partnerId}/alerts`}
              onClick={() => setOpen(false)}
              className="block border-t border-border px-3 py-2 text-center text-xs font-semibold text-accent hover:bg-bg-sunken"
            >
              View all {count} alerts
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
